function elHide(el) { 
    if (el) { 
        try { 
            el.classList.add('hidden') 
        } catch (e) { 
            console.log('failed trying to show', e) 
        } 
    } 
};

function elShow(el) { 
    if (el) { 
        try { 
            el.classList.remove('hidden') 
        } catch (e) { 
            console.log('failed trying to show', e) 
        } 
    } 
};

document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const updateSetInfo = document.getElementById('updateSetInfo');
    const updateSetDetails = document.getElementById('updateSetDetails');
    const updateObjectsEl = document.getElementById('updateObjects');
    const objectsContainer = document.getElementById('objectsContainer');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    // Known code fields in ServiceNow
    const codeFields = ['script', 'condition', 'calculation', 'html', 'xml', 'condition_script', 'script_plain', 'javascript'];

    // Handling file drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--primary)';
        dropZone.style.backgroundColor = 'var(--primary-background)';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--primary)';
        dropZone.style.backgroundColor = '';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--primary)';
        dropZone.style.backgroundColor = '';

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // Handling click to browse files
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    function handleFile(file) {
        if (file.type !== 'text/xml' && !file.name.endsWith('.xml')) {
            showError('Please upload an XML file.');
            return;
        }

        // Show loading indicator
        elShow(loadingIndicator);
        elHide(updateSetInfo);
        elHide(updateObjectsEl);
        elHide(errorMessage);

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const xmlContent = e.target.result;
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

                // Check for parsing errors
                const parserError = xmlDoc.querySelector('parsererror');
                if (parserError) {
                    throw new Error('XML parsing error');
                }

                // Process the XML
                processXML(xmlDoc);

            } catch (error) {
                showError('Error processing XML file: ' + error.message);
            } finally {
                loadingIndicator.classList.add('hidden');
            }
        };

        reader.onerror = () => {
            elHide(loadingIndicator);
            showError('Error reading the file.');
        };

        reader.readAsText(file);
    }

    function processXML(xmlDoc) {
        // Get the unload element or direct sys_update_xml if provided
        const unloadElement = xmlDoc.querySelector('unload') || xmlDoc.documentElement;
        if (!unloadElement) {
            showError('Invalid ServiceNow update set XML structure');
            return;
        }

        const unloadDate = unloadElement.getAttribute('unload_date') || 'N/A';

        // Get all update objects (sys_update_xml or any direct children)
        const updateObjects = Array.from(unloadElement.children).filter(el =>
            el.nodeName !== '#text' && el.nodeName !== '#comment'
        );

        if (updateObjects.length === 0) {
            objectsContainer.innerHTML = '<p>No update objects found in this XML file.</p>';
        } else {
            // Display update set info if available
            const remoteUpdateSetElement = unloadElement.querySelector('sys_remote_update_set');
            if (remoteUpdateSetElement) {
                displayUpdateSetInfo(unloadDate, remoteUpdateSetElement);
            } else {
                updateSetDetails.innerHTML = `<p><strong>Unload Date:</strong> ${unloadDate}</p>`;
            }

            displayUpdateObjects(updateObjects);
        }

        // Show result sections
        elShow(updateSetInfo);
        elShow(updateObjectsEl);
    }

    function displayUpdateSetInfo(unloadDate, updateSetElement) {
        let html = `<p><strong>Unload Date:</strong> ${unloadDate}</p>`;
        html += '<table>';
        html += '<thead><tr><th>Property</th><th>Value</th></tr></thead>';
        html += '<tbody>';

        // Get all child elements
        updateSetElement.childNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const propertyName = node.nodeName;
                const propertyValue = node.textContent.trim();
                html += `<tr><td>${propertyName}</td><td>${propertyValue}</td></tr>`;
            }
        });

        html += '</tbody></table>';
        updateSetDetails.innerHTML = html;
    }

    function displayUpdateObjects(objects) {
        objectsContainer.innerHTML = '';

        objects.forEach((obj, index) => {
            if (obj.nodeType !== Node.ELEMENT_NODE) return;

            const tableName = obj.nodeName;
            const action = obj.getAttribute('action') || 'N/A';

            const objDiv = document.createElement('div');
            objDiv.className = 'table-container';
            objDiv.id = `object-${index}`;

            let html = `<h3 class="object-header">${tableName} (Action: ${action})</h3>`;

            // Create a table for basic object properties (excluding payload)
            html += '<table>';
            html += '<thead><tr><th>Field</th><th>Value</th></tr></thead>';
            html += '<tbody>';

            // Process all direct child elements except payload
            const payloadElement = obj.querySelector('payload');
            Array.from(obj.children).forEach(node => {
                if (node.nodeName.toLowerCase() !== 'payload') {
                    const fieldName = node.nodeName;
                    const fieldValue = node.textContent.trim();
                    html += `<tr><td>${fieldName}</td><td>${fieldValue}</td></tr>`;
                }
            });

            html += '</tbody></table>';

            // Handle payload if exists
            if (payloadElement) {
                const payloadContent = payloadElement.textContent.trim();
                if (payloadContent) {
                    html += '<div class="payload-container">';
                    html += '<details>';
                    html += '<summary>Payload Content</summary>';

                    try {
                        // Try to parse the payload content as XML
                        const payloadParser = new DOMParser();
                        const payloadDoc = payloadParser.parseFromString(payloadContent, 'text/xml');

                        // Check if parsing was successful
                        if (!payloadDoc.querySelector('parsererror')) {
                            // Get the record_update if it exists
                            const recordUpdateElement = payloadDoc.querySelector('record_update');

                            if (recordUpdateElement) {
                                const tableName = recordUpdateElement.getAttribute('table') || 'N/A';
                                html += `<div class="payload-section"><h4>Record Update (Table: ${tableName})</h4>`;

                                // Process each direct child of record_update
                                Array.from(recordUpdateElement.children).forEach((recordElement, recordIndex) => {
                                    if (recordElement.nodeType === Node.ELEMENT_NODE) {
                                        const recordName = recordElement.nodeName;
                                        const recordAction = recordElement.getAttribute('action') || 'N/A';

                                        html += `<div class="nested-table">`;
                                        html += `<h5>${recordName} (Action: ${recordAction})</h5>`;
                                        html += '<table>';
                                        html += '<thead><tr><th>Field</th><th>Value</th></tr></thead>';
                                        html += '<tbody>';

                                        // Process all child elements
                                        processRecordElement(recordElement, recordIndex, index).forEach(row => {
                                            html += row;
                                        });

                                        html += '</tbody></table></div>';
                                    }
                                });

                                html += '</div>';
                            } else {
                                // If no record_update, just display the root element
                                const rootElement = payloadDoc.documentElement;
                                html += `<div class="payload-section"><h4>${rootElement.nodeName}</h4>`;

                                html += '<table>';
                                html += '<thead><tr><th>Field</th><th>Value</th></tr></thead>';
                                html += '<tbody>';

                                // Process attributes
                                Array.from(rootElement.attributes).forEach(attr => {
                                    html += `<tr><td>${attr.name}</td><td>${attr.value}</td></tr>`;
                                });

                                // Process child elements
                                processRecordElement(rootElement, 0, index).forEach(row => {
                                    html += row;
                                });

                                html += '</tbody></table>';
                                html += '</div>';
                            }
                        } else {
                            // If parsing failed, show raw content
                            html += `<pre><code class="language-xml">${escapeHtml(payloadContent)}</code></pre>`;
                        }
                    } catch (error) {
                        html += '<p>Error parsing payload: ' + error.message + '</p>';
                        html += `<pre><code class="language-xml">${escapeHtml(payloadContent)}</code></pre>`;
                    }

                    html += '</details>';
                    html += '</div>';
                }
            }

            objDiv.innerHTML = html;
            objectsContainer.appendChild(objDiv);
        });

        // Apply syntax highlighting
        hljs.highlightAll();
    }

    function processRecordElement(element, recordIndex, objectIndex) {
        const rows = [];

        // Process attributes
        Array.from(element.attributes).forEach(attr => {
            if (attr.name !== 'action') { // Action is already shown in the header
                rows.push(`<tr><td>${attr.name}</td><td>${attr.value}</td></tr>`);
            }
        });

        // Process all child elements
        Array.from(element.children).forEach((childNode, childIndex) => {
            const fieldName = childNode.nodeName;

            // Check if this is a code field that needs special handling
            if (codeFields.includes(fieldName.toLowerCase())) {
                const cdataContent = extractCDATAContent(childNode);
                if (cdataContent) {
                    // Detect language - default to javascript
                    let language = 'javascript';
                    if (fieldName.toLowerCase() === 'html') language = 'html';
                    if (fieldName.toLowerCase() === 'xml') language = 'xml';

                    const codeId = `code-${objectIndex}-${recordIndex}-${childIndex}`;

                    rows.push(`<tr><td>${fieldName}</td><td>
                <div class="code-container">
                  <pre><code id="${codeId}" class="language-${language}">${escapeHtml(cdataContent)}</code></pre>
                </div>
              </td></tr>`);
                } else {
                    // If no CDATA but still code field
                    const textContent = childNode.textContent.trim();
                    if (textContent) {
                        let language = 'javascript';
                        if (fieldName.toLowerCase() === 'html') language = 'html';
                        if (fieldName.toLowerCase() === 'xml') language = 'xml';

                        const codeId = `code-${objectIndex}-${recordIndex}-${childIndex}`;

                        rows.push(`<tr><td>${fieldName}</td><td>
                  <div class="code-container">
                    <pre><code id="${codeId}" class="language-${language}">${escapeHtml(textContent)}</code></pre>
                  </div>
                </td></tr>`);
                    } else {
                        rows.push(`<tr><td>${fieldName}</td><td><em>Empty</em></td></tr>`);
                    }
                }
            }
            // Check if this element has child elements (not just text)
            else if (childNode.children.length === 0 ||
                (childNode.children.length === 0 && childNode.textContent.trim() !== '')) {
                // Simple element with just text content
                const fieldValue = childNode.textContent.trim();

                // If it's a long text, provide a truncated view
                if (fieldValue.length > 100) {
                    const truncId = `trunc-${objectIndex}-${recordIndex}-${childIndex}`;
                    const fullId = `full-${objectIndex}-${recordIndex}-${childIndex}`;

                    rows.push(`<tr><td>${fieldName}</td><td>
                <span id="${truncId}" class="truncate">${escapeHtml(fieldValue.substring(0, 100))}...</span>
                <details>
                  <summary>Show full text</summary>
                  <div id="${fullId}">${escapeHtml(fieldValue)}</div>
                </details>
              </td></tr>`);
                } else {
                    rows.push(`<tr><td>${fieldName}</td><td>${escapeHtml(fieldValue)}</td></tr>`);
                }
            } else {
                // Element with children - summarize it
                const displayValue = childNode.getAttribute('display_value');
                const childrenCount = childNode.children.length;

                if (displayValue) {
                    rows.push(`<tr><td>${fieldName}</td><td>${displayValue} <em>(has ${childrenCount} subelements)</em></td></tr>`);
                } else {
                    rows.push(`<tr><td>${fieldName}</td><td><em>Complex element with ${childrenCount} subelements</em></td></tr>`);
                }
            }
        });

        return rows;
    }

    function extractCDATAContent(element) {
        // Look for CDATA sections inside the element
        for (let i = 0; i < element.childNodes.length; i++) {
            const node = element.childNodes[i];
            if (node.nodeType === Node.CDATA_SECTION_NODE) {
                return node.nodeValue;
            }
        }

        // If no direct CDATA children, look in the HTML
        const html = element.innerHTML;
        if (html) {
            const cdataMatch = html.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
            if (cdataMatch && cdataMatch[1]) {
                return cdataMatch[1];
            }
        }

        return null;
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function showError(message) {
        errorText.textContent = message;
        elShow(errorMessage);
        elHide(updateSetInfo);
        elHide(updateObjectsEl);
    }
});