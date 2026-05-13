document.addEventListener('DOMContentLoaded', () => {
    const instanceForm = document.getElementById('instanceForm');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    const resultContainer = document.getElementById('resultContainer');
    const replicationTable = document.getElementById('replicationTable');

    instanceForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const instanceUrl = document.getElementById('instanceUrl').value.trim();

        loadingIndicator.style.display = 'block';
        errorMessage.style.display = 'none';
        resultContainer.style.display = 'none';

        const body = { "url": instanceUrl };
        const headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        };

        fetch("/api/instance-info", {
            method: "POST",
            body: JSON.stringify(body),
            headers: headers
        })
        .then(response => response.json())
        .then(data => {
            loadingIndicator.style.display = 'none';

            if (data.error) {
                errorMessage.textContent = data.error;
                errorMessage.style.display = 'block';
                return;
            }

            displayInstanceInfo(data);
            resultContainer.style.display = 'block';
        })
        .catch(error => {
            loadingIndicator.style.display = 'none';
            errorMessage.textContent = `Failed to retrieve instance information: ${error.message}`;
            errorMessage.style.display = 'block';
            console.error("Error:", error);
        });
    });

    function displayInstanceInfo(data) {
        replicationTable.innerHTML = '';

        if (data.buildName) {
            addTableRow(replicationTable, 'Build Name', data.buildName);
        } else {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = '<td colspan="2">No version information available</td>';
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
