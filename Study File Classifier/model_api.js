// API endpoints for different models
const API_ENDPOINTS = {
    'gpt-4o': 'https://api.openai.com/v1/chat/completions',
    'gemini-pro': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
};

// Store the selected model
let selectedModel = 'gpt-4o';

// Function to show status messages
function showStatusMessage(message, isError = false) {
    const statusContainer = document.getElementById('status-container');
    statusContainer.textContent = message;
    statusContainer.className = isError ? 'status-message status-error' : 'status-message status-info';
    statusContainer.style.display = 'block';
    
    // Auto-hide after 10 seconds for non-error messages
    if (!isError) {
        setTimeout(() => {
            statusContainer.style.display = 'none';
        }, 10000);
    }
}

// Function to call the OpenAI API with retry mechanism
async function callOpenAI(prompt, documents, retryCount = 0, maxRetries = 3) {
    const messages = [
        {
            role: "system",
            content: "You are an expert in Human-Computer Interaction (HCI) tasked with classifying academic documents into relevant categories. Analyze the provided text files and assign the most appropriate tags from the predefined list."
        },
        {
            role: "user",
            content: formatOpenAIPrompt(prompt, documents)
        }
    ];

    try {
        const response = await fetch(API_ENDPOINTS['gpt-4o'], {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-2024-08-06",
                messages: messages,
                max_tokens: 2000
            })
        });

        console.log("Response status:", response.status);
        
        // Handle rate limiting
        if (response.status === 429) {
            if (retryCount < maxRetries) {
                const retryAfter = response.headers.get('Retry-After') || Math.pow(2, retryCount + 1);
                const waitTime = parseInt(retryAfter) * 1000;
                
                showStatusMessage(`Rate limited by OpenAI. Retrying in ${waitTime/1000} seconds...`);
                
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return callOpenAI(prompt, documents, retryCount + 1, maxRetries);
            } else {
                showStatusMessage("Maximum retry attempts reached for OpenAI API. Try switching to Gemini model.", true);
                throw new Error("Rate limit exceeded. Maximum retries reached.");
            }
        }

        const data = await response.json();
        console.log("OpenAI API Response:", data);

        if (data.error) {
            throw new Error(`API Error: ${data.error.message || "Unknown error"}`);
        }

        if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        } else {
            throw new Error("Invalid response format from OpenAI API");
        }
    } catch (error) {
        console.error("Error calling OpenAI API:", error);
        throw error;
    }
}

// Function to call the Google Gemini API with retry mechanism
async function callGemini(prompt, documents, retryCount = 0, maxRetries = 3) {
    const formattedPrompt = formatGeminiPrompt(prompt, documents);
    
    try {
        const response = await fetch(`${API_ENDPOINTS['gemini-pro']}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: formattedPrompt
                            }
                        ]
                    }
                ]
            })
        });

        console.log("Response status:", response.status);
        
        // Handle rate limiting
        if (response.status === 429) {
            if (retryCount < maxRetries) {
                const retryAfter = response.headers.get('Retry-After') || Math.pow(2, retryCount + 1);
                const waitTime = parseInt(retryAfter) * 1000;
                
                showStatusMessage(`Rate limited by Gemini. Retrying in ${waitTime/1000} seconds...`);
                
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return callGemini(prompt, documents, retryCount + 1, maxRetries);
            } else {
                showStatusMessage("Maximum retry attempts reached for Gemini API. Try switching to OpenAI model.", true);
                throw new Error("Rate limit exceeded. Maximum retries reached.");
            }
        }

        const data = await response.json();
        console.log("Gemini API Response:", data);

        if (data.error) {
            throw new Error(`API Error: ${data.error.message || "Unknown error"}`);
        }

        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error("Invalid response format from Gemini API");
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw error;
    }
}

// Format prompt for OpenAI
function formatOpenAIPrompt(prompt, documents) {
    let formattedPrompt = prompt + "\n\n";
    
    documents.forEach((doc, index) => {
        formattedPrompt += `Document ${index + 1}: "${doc.name}"\n`;
        formattedPrompt += `Content: ${doc.content}\n\n`;
    });
    
    formattedPrompt += "For each document, provide the following:\n";
    formattedPrompt += "1. The most appropriate tag or tags from the provided list\n";
    formattedPrompt += "2. A brief explanation of why this tag is appropriate\n";
    formattedPrompt += "3. Any key concepts or terms identified in the document\n\n";
    formattedPrompt += "Format your response as JSON with the following structure for each document:\n";
    formattedPrompt += '{ "documentName": "name", "assignedTags": ["tag1", "tag2"], "explanation": "reason", "keyTerms": ["term1", "term2"] }';
    
    return formattedPrompt;
}

// Format prompt for Gemini
function formatGeminiPrompt(prompt, documents) {
    // Similar to OpenAI but adjusted for Gemini's expectations
    let formattedPrompt = "You are an expert in Human-Computer Interaction (HCI) tasked with classifying academic documents into relevant categories.\n\n";
    formattedPrompt += prompt + "\n\n";
    
    documents.forEach((doc, index) => {
        formattedPrompt += `Document ${index + 1}: "${doc.name}"\n`;
        formattedPrompt += `Content: ${doc.content}\n\n`;
    });
    
    formattedPrompt += "For each document, provide the following:\n";
    formattedPrompt += "1. The most appropriate tag or tags from the provided list\n";
    formattedPrompt += "2. A brief explanation of why this tag is appropriate\n";
    formattedPrompt += "3. Any key concepts or terms identified in the document\n\n";
    formattedPrompt += "Format your response as JSON with the following structure for each document:\n";
    formattedPrompt += '{ "documentName": "name", "assignedTags": ["tag1", "tag2"], "explanation": "reason", "keyTerms": ["term1", "term2"] }';
    
    return formattedPrompt;
}

// Main function to process documents using the selected model
async function processDocuments(prompt, documents) {
    showStatusMessage(`Processing with ${selectedModel}...`);
    
    try {
        if (selectedModel === 'gpt-4o') {
            return await callOpenAI(prompt, documents);
        } else if (selectedModel === 'gemini-pro') {
            return await callGemini(prompt, documents);
        } else {
            throw new Error("Unsupported model selected");
        }
    } catch (error) {
        showStatusMessage(`Error: ${error.message}`, true);
        throw error;
    }
}