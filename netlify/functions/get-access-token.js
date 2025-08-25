const { JWT } = require('google-auth-library');

/**
 * Netlify Function to obtain a Google API access token using a service account.
 * This token can be used for both Google Sheets and Google Drive operations.
 */
exports.handler = async (event) => {
    try {

        // 1. Read credentials directly from environment variable
        const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_CONTENT);
        
        // 2. Validate that the required fields are present
        if (!credentials.client_email || !credentials.private_key) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing Google credentials in environment variables' })
            };
        }

        // 3. Create a JWT client using the service account credentials
        const auth = new JWT(
            credentials.client_email,
            null,
            credentials.private_key,
            [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive.file'
            ]
        );

        // 4. Authorize the client and get an access token
        await auth.authorize();
        const { token } = await auth.getAccessToken();

        // 5. Return the access token in the response
        return {
            statusCode: 200,
            body: JSON.stringify({ access_token: token }),
        };
    } catch (error) {
        console.error('Error getting access token:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message,
                message: 'Failed to retrieve access token using service account.',
            }),
        };
    }
};