export default defineComponent({
  async run({ steps, $ }) {
    // Reference previous step data using the steps object and return data to use it in future steps
    console.log(steps.get_check_in_data.result, process.env.githubFilePath);
    const {
      githubOwner,
      githubBranch,
      githubFilePath,
      githubRepo,
      githubToken,
    } = process.env;
    const fileContent = steps.get_check_in_data.result;

    try {
      const apiUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${githubFilePath}`;
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
        message: `Updating ${githubFilePath}. ${new Date().toLocaleTimeString()}`,
        content: Buffer.from(JSON.stringify(fileContent)).toString("base64"),
        branch: githubBranch,
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
      console.log(
        "File successfully created/updated:",
        putData.content.html_url,
      );
    } catch (error) {
      console.error("An error occurred:", error.message);
      throw error;
    }
  },
});
