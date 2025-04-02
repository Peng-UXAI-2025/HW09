let API_URL = "https://api.openai.com/v1/chat/completions";

async function chatCompletion(messages, model = "gpt-4o-2024-08-06", max_tokens = 2000) {
    let res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
            model,
            max_tokens,
            messages,
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8",
            "Authorization": `Bearer ${OPENAI_API_KEY}`, 
        },
    });

    let json = await res.json();

    // Print all information - type mCaption in the console
    console.log("Full API Response:", json);

    return json.choices[0]?.message?.content || "No valid response received.";
}

// Bing Search API integration
const SEARCH_API_URL = "https://api.bing.microsoft.com/v7.0/search";

async function searchOnline(query) {
    try {
        let res = await fetch(`${SEARCH_API_URL}?q=${encodeURIComponent(query)}`, {
            method: "GET",
            headers: {
                "Ocp-Apim-Subscription-Key": BING_API_KEY // unfinished
            }
        });

        let json = await res.json();

        if (json.webPages && json.webPages.value.length > 0) {
            return json.webPages.value.slice(0, 3).map(result => result.snippet).join("\n");
        }
        return "No relevant online information found.";
    } catch (error) {
        console.error("Error fetching online search results:", error);
        return "Error retrieving search results.";
    }
}
