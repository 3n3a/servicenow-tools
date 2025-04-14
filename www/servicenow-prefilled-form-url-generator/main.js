const s = {};

let fieldCount = 1;
let fields = [];
let output = '';

const fieldEventListener = 'keyup';


s.addField = function () {
    fieldCount++;
    const newFieldRow = document.createElement('div');
    newFieldRow.className = 'grid';
    newFieldRow.innerHTML = `
    <div>
    <label for="field_name${fieldCount}">Field Name:</label>
    <input type="text" id="field_name${fieldCount}" name="field_name${fieldCount}">
    </div>
    <div>
                    <label for="field_value${fieldCount}">Field Value:</label>
                    <input type="text" id="field_value${fieldCount}" name="field_value${fieldCount}">
                    `;
    document.getElementById('fields').appendChild(newFieldRow);
    document.getElementById(`field_name${fieldCount}`).addEventListener(fieldEventListener, s.updateOutput);
    document.getElementById(`field_value${fieldCount}`).addEventListener(fieldEventListener, s.updateOutput);
}

s.updateOutput = function () {
    console.log("updating output")
    const instance = document.getElementById('instance').value;
    const table = document.getElementById('table').value;
    const fieldNames = document.querySelectorAll('[id^=field_name]');
    const fieldValues = document.querySelectorAll('[id^=field_value]');
    let queryParams = 'sys_id=-1&sysparm_query=';

    fields = [];
    for (let i = 0; i < fieldNames.length; i++) {
        const fieldName = fieldNames[i].value;
        const fieldValue = fieldValues[i].value;
        if (fieldName && fieldValue) {
            fields.push({ fieldName, fieldValue });
            queryParams += encodeURIComponent(`${fieldName}=${fieldValue}^`);
        }
    }

    if (queryParams.endsWith('^')) {
        queryParams = queryParams.slice(0, -1);
    }

    output = `https://${instance}.service-now.com/${table}.do?${queryParams}`;
    document.getElementById('output').textContent = output;

    s.saveToLocalStorage(instance, table, fields);
}

s.saveToLocalStorage = function (instance, table, fields) {
    localStorage.setItem('instance', instance);
    localStorage.setItem('table', table);
    localStorage.setItem('fields', JSON.stringify(fields));
}

s.loadFromLocalStorage = function () {
    const instance = localStorage.getItem('instance');
    const table = localStorage.getItem('table');
    const fields = JSON.parse(localStorage.getItem('fields'));

    if (instance) {
        document.getElementById('instance').value = instance;
    }
    if (table) {
        document.getElementById('table').value = table;
    }
    if (fields) {
        fields.forEach((field, index) => {
            if (index > 0) s.addField();
            document.getElementById(`field_name${index + 1}`).value = field.fieldName;
            document.getElementById(`field_value${index + 1}`).value = field.fieldValue;
        });
    }
    s.updateOutput();
}

s.copyOutput = function () {
    navigator.clipboard.writeText(output).then(() => {
        const copyBtn = document.getElementById('copy-clipboard');
        const oldContent = copyBtn.textContent;
        copyBtn.textContent = 'Copied!'
        setTimeout(() => {
            copyBtn.textContent = oldContent;
        }, 800);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}


window.s = s;
window.onload = () => {
    console.log("registering event listeners")
    document.getElementById('instance').addEventListener(fieldEventListener, s.updateOutput);
    document.getElementById('table').addEventListener(fieldEventListener, s.updateOutput);
    document.getElementById('field_name1').addEventListener(fieldEventListener, s.updateOutput);
    document.getElementById('field_value1').addEventListener(fieldEventListener, s.updateOutput);
    s.loadFromLocalStorage()
}