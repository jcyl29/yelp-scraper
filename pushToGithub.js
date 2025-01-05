const owner = "jcyl29"; // Replace with your GitHub username
const repo = "yelp-scraper"; // Replace with your repository name
const branch = "main"; // Replace with the target branch

const pushToGithub = async ({ githubToken, filePath, fileContent }) => {
  try {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    console.log("API URL:", apiUrl);

    // Fetch file SHA if it exists
    let sha;
    const getResponse = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (getResponse.status === 200) {
      const fileData = await getResponse.json();
      sha = fileData.sha;
      console.log("File exists, SHA:", sha);
    } else if (getResponse.status !== 404) {
      const errorDetails = await getResponse.json();
      console.error("GET error details:", errorDetails);
      throw new Error(`Failed to fetch file: ${getResponse.status}`);
    } else {
      console.log("File does not exist; creating a new one.");
    }

    // Create/Update file
    const putBody = {
      message: `Updating ${filePath} via script. ${new Date().toLocaleString()}`,
      content: Buffer.from(JSON.stringify(fileContent)).toString("base64"),
      branch,
    };
    if (sha) putBody.sha = sha;

    console.log("PUT body:", JSON.stringify(putBody));

    const putResponse = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(putBody),
    });

    if (!putResponse.ok) {
      const errorDetails = await putResponse.json();
      console.error("PUT error details:", errorDetails);
      throw new Error(`Failed to create/update file: ${putResponse.status}`);
    }

    const putData = await putResponse.json();
    console.log("File successfully created/updated:", putData.content.html_url);
    return { fileUrl: putData.content.html_url };
  } catch (error) {
    console.error("An error occurred:", error.message);
    throw error;
  }
};

export default pushToGithub;
