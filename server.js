const express = require('express');
const app = express();
const PORT = 3000;

const path = require('path');
require('dotenv').config(); // Load environment variables from .env file
const { GraphQLClient, gql } = require('graphql-request'); // Import GraphQL client for making requests
const cookieParser = require('cookie-parser')


app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the 'public' directory
app.use(express.json()); // Parse JSON request bodies
app.use(cookieParser()); // Parse cookies


app.post('/login', async (req, res) => {
    // #region POST /login
    const user = req.body.username
    const pass = req.body.password
    const url = "https://publicapi-rc.successwareg2.com/api/login"

    let response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: user,
            password: pass
        })
    })
    let data = await response.json();

    if (!data.access_token) {
        res.status(401).json({ error: 'Unauthorized' });
        return
    }

    res.cookie('access_token', data.access_token, {
        httpOnly: true,
        maxAge: data.expires_in * 1000
    });

    res.status(200).json({ message: 'success' });
    // #endregion
});

app.get('/authenticate', (req, res) => {
    // #region GET /authenticate
    const accessToken = req.cookies.access_token;
    if (!accessToken) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    res.json({ message: 'Success' });
    // #endregion
});


app.post('/jobs', async (req, res) => {
    // #region GET /jobs
    const token = req.cookies.access_token; // Get the token from the request headers
    startDate = req.body.startDate
    endDate = req.body.endDate

    if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }


    const endpoint = "https://publicapi-rc.successwareg2.com/api/graphql";
    const client = new GraphQLClient(endpoint, {
        headers: {
            Authorization: `Bearer ${token} `,
        },
    });
    const query = gql`
  query SearchJobs ($page: Int!, $size: Int!) {
    searchJobs(
        input: {
            assignmentsCompleted: true
        }
        page: $page
        size: $size
    ) {
        successful
        message
        totalElements
        totalPages
        pageSize
        pageNumber
        numberOfElements
        content {
            id
            number
            jobClass
            jobType
            jobTypeDescription
            status
            serviceAccountId
            locationId
            department
            leadSourceType
            zoneId
            startDate
            endDate
            scheduledFor
            callId
            departmentId
            phoneNumber
            leadSourceTypeId
            leadSourceId
            customerPONumber
            contact
            claimNo
            contractNo
            sendBooked
            sendReminder
            legacyJobId
            legacyZoneId
            legacyLocationId
            legacyCampaignId
            legacyOpportunityId
            legacyProgressId
            legacyCallStatus
            notes
            priority
            isNotified
            priorityLevel
            dnis
            reviewedAtLocal
            startDateLocal
            endDateLocal
            scheduledForLocal
            createdAtLocal
            followUpDateLocal
            followUpDateSalesLocal
            saleEstDateLocal
            assignments {
                id
                employeeCode
                primaryEmployeeCode
                status
                estimatedDuration
                confirmedAt
                assignedAt
                scheduledFor
                notifiedAt
                dispatchedAt
                onSiteAt
                completedAt
                attentionNote
                isPrimary
                timePreference
                startTimePreference
                endTimePreference
                createdAtLocal
                confirmedAtLocal
                assignedAtLocal
                scheduledForLocal
                notifiedAtLocal
                dispatchedAtLocal
                onSiteAtLocal
                completedAtLocal
                startTimePreferenceLocal
                endTimePreferenceLocal
            }
            invoices {
                id
                jobId
                type
                number
                taxCode
                employeeCode
                totalAmount
                arInvoiceId
                serviceAccountId
                locationId
                workCompletedNotes
                workSuggestedNotes
            }
        }
    }
}


 `;
    try {
        const pageSize = 50;
        const firstResponse = await client.request(query, { page: 0, size: pageSize });


        const totalPages = firstResponse.searchJobs.totalPages;
        const allJobs = [...firstResponse.searchJobs.content];

        const pageNumbers = Array.from({ length: totalPages - 1 }, (_, i) => i + 1); // [1, 2, ..., totalPages-1]

        // Batch in groups (e.g., 5 pages at a time)
        const batchSize = 5;
        for (let i = 0; i < pageNumbers.length; i += batchSize) {
            const batch = pageNumbers.slice(i, i + batchSize);

            const batchPromises = batch.map(page =>
                client.request(query, { page, size: pageSize })
            );

            const results = await Promise.all(batchPromises);
            results.forEach(res => {
                if (res && res.searchJobs && res.searchJobs.content) {
                    allJobs.push(...res.searchJobs.content);
                }
            });
        }

        // Assign completedDate based on latest completed assignment
        const jobsWithCompletedDates = allJobs.map(job => {
            const completedAssignments = job.assignments.filter(a => a.completedAt);
            const latestCompleted = completedAssignments
                .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];

            job.completedDate = latestCompleted
                ? new Date(latestCompleted.completedAt).toISOString().split("T")[0]
                : null;

            return job;
        });

        // Filter by date range
        const filteredData = jobsWithCompletedDates.filter(job =>
            job.completedDate &&
            job.completedDate >= startDate &&
            job.completedDate <= endDate
        );

        res.json({ data: filteredData });
    } catch (error) {
        console.error("GraphQL batched pagination failed:", error);
        res.status(500).json({ error: 'Failed to fetch paginated data' });
    }
    // #endregion
});

app.post('/locations', async (req, res) => {
    // #region GET /locations
    const token = req.cookies.access_token; // Get the token from the request headers
    const locationId = req.body.locationId

    if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const endpoint = "https://publicapi-rc.successwareg2.com/api/graphql";
    const client = new GraphQLClient(endpoint, {
        headers: {
            Authorization: `Bearer ${token} `,
        },
    });
    const query = gql`
    query GetLocationInfoByLocationId ($locationId: Long!) {
    getLocationInfoByLocationId(locationId: $locationId) {
        successful
        message
        locationInfo {
            id
            address1
            address2
            city
            state
            zipCode
            type
            contact
            contractArBillingCustomerId
            contractComment
            contractNo
            serviceType
            sizeOfService
            openMarketingCount
            customerAccounts {
                serviceAccountId
                primaryBillingCustomerId
                customer {
                    id
                    firstName
                    lastName
                    phoneNumber
                    extension
                    email
                    title
                    leadSource
                    sourceType
                    leadSourceTypeId
                    leadSourceId
                    altFirstName
                    altLastName
                    referral
                    noEmail
                    alternameNameInAddress
                    alternateTitle
                    phone1Ext
                    phone2
                    phone2Ext
                    phone3
                    phone3Ext
                    phone4
                    phone4Ext
                    legacyLocationId
                    leadSourceDescription
                    commercial
                    companyName
                    dnis
                }
                primaryBillingAddress {
                    address1
                    address2
                    city
                    state
                    zipCode
                }
            }
            communicationPreference {
                locationId
                id
                optOut
                optIn
                serviceAccountId
                communicationClass {
                    id
                    className
                    optInRequired
                }
            }
            priority
        }
    }
}
`;
    const variables = {
        locationId: String(locationId)
    };
    try {
        const response = await client.request(query, variables);
        res.json({ data: response.getLocationInfoByLocationId });
    } catch (error) {
        console.error("GraphQL query failed:", error);
        res.status(500).json({ error: 'Failed to fetch location data' });
    }
    // #endregion
});

app.post('/communications', async (req, res) => {
    // #region GET /communications
    const token = req.cookies.access_token; // Get the token from the request headers
    const locationId = req.body.locationId

    if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const endpoint = "https://publicapi-rc.successwareg2.com/api/graphql";
    const client = new GraphQLClient(endpoint, {
        headers: {
            Authorization: `Bearer ${token} `,
        },
    });
    const query = gql`
    query GetCommunicationPreferenceByLocationId ($locationId: Long!) {
    getCommunicationPreferenceByLocationId(locationId: $locationId) {
        locationId
        id
        optOut
        optIn
        serviceAccountId
        communicationClass {
            id
            className
            optInRequired
        }
    }
}
`;
    const variables = {
        locationId: String(locationId)
    };
    try {
        const response = await client.request(query, variables);
        res.json({ data: response.getCommunicationPreferenceByLocationId });
    } catch (error) {
        console.error("GraphQL query failed:", error);
        res.status(500).json({ error: 'Failed to fetch location data' });
    }
    // #endregion
}
);




app.listen(3000, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});