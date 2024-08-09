function logToPre(message) {
const logElement = document.getElementById('log');
logElement.textContent += message + '\n';
}

function createDownloadLink(blob, filename) {
    const fileUrl = window.URL.createObjectURL(blob);
    const anchorElement = document.createElement('a');

    anchorElement.href = fileUrl;
    anchorElement.download = filename;
    //anchorElement.style.display = 'none'

    document.body.appendChild(anchorElement);

    //anchorElement.click();
    //anchorElement.remove();

    //window.URL.revokeObjectURL(fileUrl)
}

function generateSysId() {
return crypto.subtle.digest('MD5', new TextEncoder().encode(crypto.randomUUID())).then(buffer => {
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
});
}

function getApplicationsReferencedInUpdates(root) {
const applications = new Set();
root.querySelectorAll('sys_update_xml application').forEach(elem => {
    applications.add(elem.textContent);
});
return applications;
}

function getBaseUpdateSetIdFromUpdateSets(root) {
let updateSetCount = 0;
for (const updateSet of root.querySelectorAll('sys_remote_update_set')) {
    updateSetCount++;
    const baseUpdateSet = updateSet.querySelector('remote_base_update_set');
    if (baseUpdateSet && baseUpdateSet.textContent) {
        logToPre("Base update set found.");
        return [baseUpdateSet, updateSetCount];
    }
}
logToPre("No base update set found.");
return [null, updateSetCount];
}

function getBaseUpdateSetName(root, baseUpdateSetId) {
for (const updateSet of root.querySelectorAll('sys_remote_update_set')) {
    if (updateSet.querySelector('sys_id').textContent === baseUpdateSetId.textContent) {
        const nameElement = updateSet.querySelector('name');
        return nameElement ? nameElement.textContent : null;
    }
}
return null;
}

function inferBaseUpdateSetNameFromSingleUpdateSet(root) {
const updateSet = root.querySelector('sys_remote_update_set');
if (updateSet) {
    const nameElement = updateSet.querySelector('name');
    return nameElement ? nameElement.textContent : null;
}
return null;
}

async function createOrRetrieveParentUpdateSet(baseUpdateSet, root, newBaseSetNameParent, createdByEmail) {
if (!baseUpdateSet) {
    const parentUpdateSet = document.createElement('sys_remote_update_set');
    parentUpdateSet.setAttribute('action', 'INSERT_OR_UPDATE');

    const parentName = document.createElement('name');
    parentName.textContent = newBaseSetNameParent;
    parentUpdateSet.appendChild(parentName);

    const parentApplication = document.createElement('application');
    parentApplication.textContent = 'global';
    parentUpdateSet.appendChild(parentApplication);

    const parentState = document.createElement('state');
    parentState.textContent = 'loaded';
    parentUpdateSet.appendChild(parentState);

    const parentSysIdString = await generateSysId();

    const parentSysId = document.createElement('sys_id');
    parentSysId.textContent = parentSysIdString;
    parentUpdateSet.appendChild(parentSysId);

    const parentRemoteBaseUpdateSet = document.createElement('remote_base_update_set');
    parentRemoteBaseUpdateSet.textContent = parentSysIdString;
    parentUpdateSet.appendChild(parentRemoteBaseUpdateSet);

    const parentSysClassName = document.createElement('sys_class_name');
    parentSysClassName.textContent = 'sys_remote_update_set';
    parentUpdateSet.appendChild(parentSysClassName);

    const parentSysCreatedBy = document.createElement('sys_created_by');
    parentSysCreatedBy.textContent = createdByEmail;
    parentUpdateSet.appendChild(parentSysCreatedBy);

    root.insertBefore(parentUpdateSet, root.firstChild);

    return parentSysIdString;
} else {
    return baseUpdateSet;
}
}

function updateSysRemoteUpdateSetElements(root, matchedApplications, parentSysIdString) {
for (const updateSet of root.querySelectorAll('sys_remote_update_set')) {
    const application = updateSet.querySelector('application');
    if (application && matchedApplications.has(application.textContent)) {
        const parent = updateSet.querySelector('parent');
        if (parent) {
            parent.textContent = parentSysIdString;
        }
        const remoteBaseUpdateSet = updateSet.querySelector('remote_base_update_set');
        if (remoteBaseUpdateSet) {
            remoteBaseUpdateSet.textContent = parentSysIdString;
        }
    }
}
}

async function generateChildUpdateSets(unmatchedApplications, root, newBaseSetNameChild, parentSysIdString, createdByEmail) {
const applicationIdMap = {};
for (const unmatchedApplication of unmatchedApplications) {
    const sysRemoteUpdateSet = document.createElement('sys_remote_update_set');
    sysRemoteUpdateSet.setAttribute('action', 'INSERT_OR_UPDATE');

    const application = document.createElement('application');
    application.textContent = unmatchedApplication;
    sysRemoteUpdateSet.appendChild(application);

    const state = document.createElement('state');
    state.textContent = 'in_hierarchy';
    sysRemoteUpdateSet.appendChild(state);

    const name = document.createElement('name');
    name.textContent = newBaseSetNameChild;
    sysRemoteUpdateSet.appendChild(name);

    const sysClassName = document.createElement('sys_class_name');
    sysClassName.textContent = 'sys_remote_update_set';
    sysRemoteUpdateSet.appendChild(sysClassName);

    const sysCreatedBy = document.createElement('sys_created_by');
    sysCreatedBy.textContent = createdByEmail;
    sysRemoteUpdateSet.appendChild(sysCreatedBy);

    const baseUpdateSet = document.createElement('remote_base_update_set');
    baseUpdateSet.textContent = parentSysIdString;
    sysRemoteUpdateSet.appendChild(baseUpdateSet);

    const parent = document.createElement('parent');
    parent.textContent = parentSysIdString;
    sysRemoteUpdateSet.appendChild(parent);

    const sysId = document.createElement('sys_id');
    const generatedSysId = await generateSysId();
    sysId.textContent = generatedSysId;
    sysRemoteUpdateSet.appendChild(sysId);

    applicationIdMap[unmatchedApplication] = generatedSysId;

    root.insertBefore(sysRemoteUpdateSet, root.firstChild);
}
return applicationIdMap;
}

function updateRemoteUpdateSetElements(root, applicationIdMap) {
for (const updateXml of root.querySelectorAll('sys_update_xml')) {
    const applicationElement = updateXml.querySelector('application');
    if (applicationElement && applicationElement.textContent) {
        const updateSetId = applicationIdMap[applicationElement.textContent];
        if (updateSetId) {
            const remoteUpdateSetElement = updateXml.querySelector('remote_update_set');
            if (remoteUpdateSetElement) {
                remoteUpdateSetElement.textContent = updateSetId;
                remoteUpdateSetElement.setAttribute('display_value', '');
            }
        }
    }
}
}

function generateUpdateSetNames(updateSetName) {
const suffixParent = " - Batch Parent";
const suffixChild = " - Batch Child";
const maxLength = 80;
const baseNameLength = maxLength - suffixParent.length;
const newBaseSetNameParent = updateSetName.slice(0, baseNameLength) + suffixParent;
const newBaseSetNameChild = updateSetName.slice(0, baseNameLength) + suffixChild;
return [newBaseSetNameParent, newBaseSetNameChild];
}
document.addEventListener('DOMContentLoaded', (event) => {
const btn = document.getElementById("process");
btn.addEventListener("click", (eventInner) => {
try {
  processFile();
} catch(e) {
  console.log(e);
  alert(e);
}
});
});

function processFile() {
const fileInput = document.getElementById('fileInput');
const status = document.getElementById('status');
const file = fileInput.files[0];
if (!file) {
    status.textContent = "Please select a file.";
    return;
}

const reader = new FileReader();
reader.onload = async function (event) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(event.target.result, "application/xml");

    const createdByEmail = prompt("Enter the email address to set the 'created_by' field on any generated update sets:");
    const applicationNames = getApplicationsReferencedInUpdates(xmlDoc);
    logToPre("The following applications were found in the updates contained within this XML: " + Array.from(applicationNames));

    const applicationsFromUpdateSets = new Set(Array.from(xmlDoc.querySelectorAll('sys_remote_update_set application')).map(elem => elem.textContent));
    const unmatchedApplications = new Set([...applicationNames].filter(app => !applicationsFromUpdateSets.has(app)));

    if (!unmatchedApplications.size) {
        status.textContent = "No unmatched applications found. Exiting.";
        return;
    }

    const [baseUpdateSetId, updateSetCount] = getBaseUpdateSetIdFromUpdateSets(xmlDoc);
    const baseUpdateSetName = baseUpdateSetId ? getBaseUpdateSetName(xmlDoc, baseUpdateSetId) : inferBaseUpdateSetNameFromSingleUpdateSet(xmlDoc);
    logToPre(updateSetCount + " update set(s) found in the XML.");
    logToPre("Original Base Update Set Name: " + baseUpdateSetName);

    const [newParentName, newChildName] = generateUpdateSetNames(baseUpdateSetName);
    logToPre("New Base Update Set Name for Parent set: " + newParentName);
    logToPre("New Base Update Set Name for Child sets: " + newChildName);

    const matchedApplications = new Set([...applicationNames].filter(app => applicationsFromUpdateSets.has(app)));
    logToPre("Matched Applications:" + Array.from(matchedApplications));

    const parentSysIdString = await createOrRetrieveParentUpdateSet(baseUpdateSetId, xmlDoc, newParentName, createdByEmail);
    updateSysRemoteUpdateSetElements(xmlDoc, matchedApplications, parentSysIdString);

    const applicationIdMap = await generateChildUpdateSets(unmatchedApplications, xmlDoc, newChildName, parentSysIdString, createdByEmail);
    updateRemoteUpdateSetElements(xmlDoc, applicationIdMap);

    const serializer = new XMLSerializer();
    logToPre("XML Debug: "+serializer.serializeToString(xmlDoc));
    const outputFileName = file.name.replace('.xml', '_fixed.xml');
    const outputBlob = new Blob([serializer.serializeToString(xmlDoc)], { type: 'application/xml' });

    createDownloadLink(outputBlob, outputFileName);
    /*
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(outputBlob);
    downloadLink.download = outputFileName;
    downloadLink.textContent = "Download Fixed XML File";
    status.innerHTML = '';
    status.appendChild(downloadLink);
    */
};
reader.readAsText(file);
}