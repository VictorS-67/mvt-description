const fetch = require('node-fetch');

exports.handler = async () => {
  const owner = "VictorS-67";
  const repo = "movement-to-onomatopoeia";
  const folder = "videos";
  const fetchUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${folder}`;

  try {
    const response = await fetch(fetchUrl, {
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch files: ${response.statusText}`);
    }
    const files = await response.json();
    const fileList = files.filter(f => f.type === "file").map(f => f.name);
    return {
      statusCode: 200,
      body: JSON.stringify(fileList),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};