// API endpoints for different models
const API_ENDPOINTS = {
    'gpt-4o': 'https://api.openai.com/v1/chat/completions',
    'gemini-2.0-flash': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
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
async function callOpenAI(notes, structure, retryCount = 0, maxRetries = 3) {
    const messages = [
        {
            role: "system",
            content: "You are an expert knowledge organizer, skilled at creating hierarchical structures from fragmented information. Your task is to organize pieces of information into a coherent knowledge tree."
        },
        {
            role: "user",
            content: formatOpenAIPrompt(notes, structure)
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
                max_tokens: 4000
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
                return callOpenAI(notes, structure, retryCount + 1, maxRetries);
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

// Function to call the Gemini API with retry mechanism
async function callGemini(notes, structure, retryCount = 0, maxRetries = 3) {
    const formattedPrompt = formatGeminiPrompt(notes, structure);
    
    try {
        const response = await fetch(`${API_ENDPOINTS['gemini-2.0-flash']}?key=${GEMINI_API_KEY}`, {
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
                ],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 4000
                }
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
                return callGemini(notes, structure, retryCount + 1, maxRetries);
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
function formatOpenAIPrompt(notes, structure) {
    let prompt = `Create a hierarchical knowledge tree from the following notes and information snippets.\n\n`;
    
    // Add notes
    prompt += `### Notes:\n`;
    notes.forEach((note, index) => {
        prompt += `${index + 1}. ${note}\n`;
    });
    
    // Add structure if provided
    if (structure && structure.trim()) {
        prompt += `\n### Suggested structure (use this as a guide, but feel free to modify):\n${structure}\n`;
    }
    
    prompt += `\n### Instructions:
1. Organize the notes into a coherent hierarchical knowledge tree
2. Create meaningful categories and subcategories
3. Place each note in the appropriate location in the hierarchy
4. Add brief explanations for key concepts
5. Identify connections between different branches

Format your response as JSON with the following structure:
{
  "title": "Main Topic",
  "summary": "Brief overview of the entire knowledge domain",
  "children": [
    {
      "title": "Category 1",
      "summary": "Description of this category",
      "content": "Detailed information including relevant notes",
      "children": [
        {
          "title": "Subcategory 1.1",
          "summary": "Description of this subcategory",
          "content": "Detailed information including relevant notes",
          "children": []
        }
      ]
    }
  ]
}`;
    
    return prompt;
}

// Format prompt for Gemini
function formatGeminiPrompt(notes, structure) {
    // Similar structure to OpenAI but adjusted for Gemini's expectations
    let prompt = `You are an expert knowledge organizer. Create a hierarchical knowledge tree from the following notes and information snippets.\n\n`;
    
    // Add notes
    prompt += `### Notes:\n`;
    notes.forEach((note, index) => {
        prompt += `${index + 1}. ${note}\n`;
    });
    
    // Add structure if provided
    if (structure && structure.trim()) {
        prompt += `\n### Suggested structure (use this as a guide, but feel free to modify):\n${structure}\n`;
    }
    
    prompt += `\n### Instructions:
1. Organize the notes into a coherent hierarchical knowledge tree
2. Create meaningful categories and subcategories
3. Place each note in the appropriate location in the hierarchy
4. Add brief explanations for key concepts
5. Identify connections between different branches

Format your response as JSON with the following structure:
{
  "title": "Main Topic",
  "summary": "Brief overview of the entire knowledge domain",
  "children": [
    {
      "title": "Category 1",
      "summary": "Description of this category",
      "content": "Detailed information including relevant notes",
      "children": [
        {
          "title": "Subcategory 1.1",
          "summary": "Description of this subcategory",
          "content": "Detailed information including relevant notes",
          "children": []
        }
      ]
    }
  ]
}

Respond with ONLY the JSON, no other text before or after it.`;
    
    return prompt;
}

// Main function to process notes using the selected model
async function processNotes(notes, structure) {
    showStatusMessage(`Processing with ${selectedModel}...`);
    
    try {
        if (selectedModel === 'gpt-4o') {
            return await callOpenAI(notes, structure);
        } else if (selectedModel === 'gemini-2.0-flash') {
            return await callGemini(notes, structure);
        } else {
            throw new Error("Unsupported model selected");
        }
    } catch (error) {
        showStatusMessage(`Error: ${error.message}`, true);
        throw error;
    }
}