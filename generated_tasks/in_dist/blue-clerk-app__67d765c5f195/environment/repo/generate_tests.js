const axios = require('axios');

const generateTestCases = async () => {
    const azureOpenAIEndpoint = `${endpoint}/openai/deployments/${deployment_name}/chat/completions?api-version=2023-03-15-preview`;
    const api_key = "";
    const payload = [
        {role: "system", content: ""},
        {role: "user", content: ``}
    ];
    const response = await axios.post(azureOpenAIEndpoint, payload, {
        headers: {
            'Content-type': 'application/json',
            'api-key': ""
        }
    });
    const testCase = response.data.choices[0].message.content.trim();
    
}