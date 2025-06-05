let table;

/**
 * Shows or hides the login page
 * @param {boolean} visible - Show or hide the login page
 */

function setLogin(visible) {
    // #region Show/Hide Login
    const login = document.getElementById('login-area');
    const app = document.getElementById('app-area');
    if (visible) {
        login.style.display = 'block';
        app.style.display = 'none';
    } else {
        login.style.display = 'none';
        app.style.display = 'block';
    }
    // #endregion
}
document.addEventListener("DOMContentLoaded", () => {
    // #region Page loaded
    fetch('/authenticate').then(response => {
        if (response.status === 401) {
            console.log('Not authenticated');
            setLogin(true);
        } else {
            console.log('Authenticated');
            setLogin(false);
        }
    })

    //initialize table
    table = new Tabulator('#table',
        {
            pagination: 'local',
            paginationSize: 15,
            columns: [
                { title: 'Job ID', field: 'id' },
                { title: 'Job Status', field: 'status' },
                { title: 'Completed Date', field: 'completedDate' },
                { title: 'Job Class', field: 'jobClass' },
                {
                    title: 'Job Description', field: 'jobTypeDescription', formatter: function (cell, formatterParams, onRendered) {
                        return cell.getValue() ? cell.getValue() : 'N/A';
                    }
                },
                { title: 'Job Location ID', field: 'locationId' },
                { title: 'Job Location Street', field: 'locationStreet' },
                { title: 'Job Location City', field: 'locationCity' },
                { title: 'Job Location State', field: 'locationState' },
                { title: 'Job Location Zip', field: 'locationZip' },
                { title: 'Total Cost', field: 'cost' },
                { title: 'Customer ID', field: 'customerId' },
                { title: 'Customer Name', field: 'name' },
                { title: 'Customer Type', field: 'customerType' },
                { title: 'Customer Street', field: 'customerStreet' },
                { title: 'Customer City', field: 'customerCity' },
                { title: 'Customer State', field: 'customerState' },
                { title: 'Customer Zip', field: 'customerZip' },
                { title: 'Do Not Mail (Do Not Solicit)', field: 'doNotMail' }
            ],

        });

    // Trigger download
    document.getElementById('download-csv').addEventListener('click', function () {
        table.download('csv', 'data.csv');
    });
    document.getElementById('download-csv').disabled = true


    // #endregion
});


document.getElementById("login-btn").addEventListener("click", () => {
    // #region User clicks login button
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const data = { username, password }


    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => {
            if (response.status === 401) {
                console.log('Unauthorized');
                setLogin(true);
                return;
            }
            setLogin(false);
            response.json()
        })
        .then(data => {
            console.log(data);
        })
    // #endregion
});

document.getElementById("query").addEventListener("click", function () {
    // #region User clicks query button

    startDate = document.getElementById("start-date").value;
    endDate = document.getElementById("end-date").value;


    // Show loading spinner
    document.getElementById('loading-spinner').style.display = 'flex';

    fetch('/jobs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            startDate,
            endDate
        })
    })
        .then(response => response.json())
        .then(async jobData => {
            //console.log(jobData);
            const jobsArray = jobData.data

            const jobsWithCost = jobsArray.map(job => {
                job.invoiceId = [];
                job.invoices.forEach(invoice => {
                    job.invoiceId.push(invoice.id);
                    if (invoice.totalAmount !== null) {
                        job.cost = invoice.totalAmount;
                    }
                    else {
                        job.cost = 'N/A';
                    }
                })
                return job;
            });

            const locationPromises = jobsWithCost.map(async (job) => {
                try {
                    const res = await fetch('/locations', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ locationId: job.locationId })
                    });

                    const locationData = await res.json();
                    job.locationData = locationData.data.locationInfo
                    job.customerType = job.locationData.type;
                    job.locationStreet = `${job.locationData.address1 ?? ''} ${job.locationData.address2 ?? ''}`.trim();
                    job.locationCity = job.locationData.city;
                    job.locationState = job.locationData.state;
                    job.locationZip = job.locationData.zipCode;

                    job.locationData.customerAccounts.forEach(account => {
                        job.customerId = account.customer.id;
                        job.name = `${account.customer.firstName} ${account.customer.lastName}`;
                        job.customerStreet = `${account.primaryBillingAddress.address1 ?? ''} ${account.primaryBillingAddress.address2 ?? ''}`.trim();
                        job.customerCity = account.primaryBillingAddress.city;
                        job.customerState = account.primaryBillingAddress.state;
                        job.customerZip = account.primaryBillingAddress.zipCode;

                    })

                    return job;
                } catch (error) {
                    console.error('Error fetching invoice data for job:', job, error);
                    return job;
                }
            }
            );
            const jobsWithLocationData = await Promise.all(locationPromises)
            //console.log(jobsWithLocationData);

            const communicationPromises = jobsWithLocationData.map(async (job) => {
                try {
                    const res = await fetch('/communications', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ locationId: job.locationId })
                    });

                    const communicationData = await res.json();
                    job.communicationData = communicationData.data;
                    return job;
                } catch (error) {
                    console.error('Error fetching invoice data for job:', job, error);
                    return job;
                }
            }
            );
            const jobsWithCommunicationData = await Promise.all(communicationPromises)
            //console.log(jobsWithCommunicationData);

            table.setData(jobsWithLocationData);

            // Hide loading spinner
            document.getElementById('loading-spinner').style.display = 'none';
            document.getElementById('download-csv').disabled = false
        })
        .catch(error => {
            console.error('Error fetching query:', error);

        })



    // #endregion
});

