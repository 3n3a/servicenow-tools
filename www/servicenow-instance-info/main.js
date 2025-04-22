        document.addEventListener('DOMContentLoaded', () => {
            const instanceForm = document.getElementById('instanceForm');
            const loadingIndicator = document.getElementById('loadingIndicator');
            const errorMessage = document.getElementById('errorMessage');
            const resultContainer = document.getElementById('resultContainer');
            const replicationTable = document.getElementById('replicationTable');
            
            instanceForm.addEventListener('submit', (event) => {
                event.preventDefault();
                
                // Get the URL from the input
                const instanceUrl = document.getElementById('instanceUrl').value.trim();
                
                // Show loading indicator
                loadingIndicator.style.display = 'block';
                errorMessage.style.display = 'none';
                resultContainer.style.display = 'none';
                
                // Prepare the request
                const body = {
                    "url": instanceUrl
                };
                
                const headers = {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                };
                
                // Make the API call
                fetch("/api/instance-info", {
                    method: "POST",
                    body: JSON.stringify(body),
                    headers: headers
                })
                .then(response => response.json())
                .then(data => {
                    // Hide loading indicator
                    loadingIndicator.style.display = 'none';
                    
                    // Check if there's an error message
                    if (data.error) {
                        errorMessage.textContent = data.error;
                        errorMessage.style.display = 'block';
                        return;
                    }
                    
                    // Otherwise, populate the tables
                    displayInstanceInfo(data);
                    resultContainer.style.display = 'block';
                })
                .catch(error => {
                    // Hide loading indicator
                    loadingIndicator.style.display = 'none';
                    
                    // Show error message
                    errorMessage.textContent = `Failed to retrieve instance information: ${error.message}`;
                    errorMessage.style.display = 'block';
                    console.error("Error:", error);
                });
            });
            
            function displayInstanceInfo(data) {
                // Clear existing table content
                replicationTable.innerHTML = '';
                
                // Add replication info
                if (data.replication) {
                    const replicationInfo = data.replication;
                    
                    // Create rows for each property
                    addTableRow(replicationTable, 'Instance', replicationInfo.instance || 'N/A');
                    addTableRow(replicationTable, 'Cluster Node', replicationInfo.cluster_node || 'N/A');
                    addTableRow(replicationTable, 'Database Name', replicationInfo.db_name || 'N/A');
                    addTableRow(replicationTable, 'Database Type', replicationInfo.db_type || 'N/A');
                    addTableRow(replicationTable, 'Database Connection', replicationInfo.db_conn || 'N/A');
                    addTableRow(replicationTable, 'Database DBMS', replicationInfo.db_dbms || 'N/A');
                } else {
                    // If no replication info is available
                    const emptyRow = document.createElement('tr');
                    emptyRow.innerHTML = '<td colspan="2">No replication information available</td>';
                    replicationTable.appendChild(emptyRow);
                }
            }
            
            function addTableRow(tableElement, property, value) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${property}</strong></td>
                    <td>${value}</td>
                `;
                tableElement.appendChild(row);
            }
        });