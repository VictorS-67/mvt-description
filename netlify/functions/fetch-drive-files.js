exports.handler = async (event, context) => {
  try {
    const { accessToken, folderId } = JSON.parse(event.body);

    if (!accessToken || !folderId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing accessToken or folderId' }),
      };
    }

    // Use direct API call instead of googleapis
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=parents+in+'${folderId}'+and+trashed=false&fields=files(id,name,mimeType)`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Google Drive API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data.files || []),
    };
    
  } catch (error) {
    console.error('Error fetching Drive files:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch files' }),
    };
  }
};