const isTokenValid = async (token) => {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github+json'
    }
  });

  return response.status === 200
}

export default isTokenValid;
