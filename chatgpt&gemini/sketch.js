// let mImg;

// function preload() {
//   mImg = loadImage("../../imgs/GDTM.jpg");
// }

// function encodeImg(img) {
//   img.loadPixels();
//   return img.canvas.toDataURL("image/jpeg");
// }

// function setup() {
//   createCanvas(windowWidth, windowHeight);
//   textSize(20);
// }

// let mCaption = "";
// function draw() {
//   background(220);
//   image(mImg, 0, 0);
//   text(mCaption, 0, mImg.height + 4, width, 200);
// }

// //chat completion
// async function mousePressed() {
//   let mMessages = [{
//     role: "user",
//     content: [
//       { type: "text", text: "Describe this image" },
//       { type: "image_url", image_url: { url: encodeImg(mImg) } },
//     ],
//   }];
//   mCaption = await chatCompletion(mMessages);
// }

async function fetchResponse() {
    const promptText = document.getElementById("prompt").value;
    const responseDiv = document.getElementById("response");
    const searchEnabled = document.getElementById("searchToggle").checked;

    if (!promptText.trim()) {
        alert("Type your question");
        return;
    }

    responseDiv.innerText = "Generating, please hold...";

    try {
        let finalPrompt = promptText;

        // If online search is enabled, fetch search results first
        if (searchEnabled) {
            const searchResults = await searchOnline(promptText);
            if (searchResults) {
                finalPrompt += "\n\n[Additional Online Info]: " + searchResults;
            }
        }

        // Message structure for API request
        const messages = [{ role: "user", content: [{ type: "text", text: finalPrompt }] }];
        let responseText = await chatCompletion(messages);

        if (!responseText || responseText.trim() === "") {
            responseDiv.innerText = "No Response";
            return;
        }

        console.log("Raw API Response:", responseText);

        // For better markdown rendering
        responseText = responseText.trim().replace(/\n\s*\n/g, '\n\n');

        // Parse Markdown content and render 
        responseDiv.innerHTML = marked.parse(responseText);
        
        // responseDiv.style.maxHeight = "400px"; 
    } catch (error) {
        console.error("Error fetching response:", error);
        responseDiv.innerText = "Error, please retry.";
    }
}
