document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI
    initializeUI();
    
    // Event listeners
    document.getElementById('add-group').addEventListener('click', addNewGroup);
    document.getElementById('process-button').addEventListener('click', processAllGroups);
    document.getElementById('process-single-group').addEventListener('click', processSingleGroup);
    document.getElementById('tags-input').addEventListener('change', updateTagsDisplay);
    
    // Model selection
    document.querySelectorAll('.model-option').forEach(option => {
        option.addEventListener('click', function() {
            // Remove selected class from all options
            document.querySelectorAll('.model-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Add selected class to clicked option
            this.classList.add('selected');
            
            // Update selected model
            selectedModel = this.dataset.model;
            console.log("Selected model:", selectedModel);
            showStatusMessage(`Model changed to ${selectedModel}`);
        });
    });
    
    // Initialize tags display
    updateTagsDisplay();
});

// Initialize UI components
function initializeUI() {
    // Add event listeners to the first group
    const firstGroup = document.querySelector('.file-group');
    setupGroupListeners(firstGroup);
}

// Set up event listeners for a file group
function setupGroupListeners(groupElement) {
    const addFilesButton = groupElement.querySelector('.add-files');
    const fileInput = groupElement.querySelector('.file-input');
    const removeGroupButton = groupElement.querySelector('.remove-group');
    
    addFilesButton.addEventListener('click', function() {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', function(event) {
        handleFileSelection(event, groupElement);
    });
    
    removeGroupButton.addEventListener('click', function() {
        // Don't remove if it's the last group
        if (document.querySelectorAll('.file-group').length > 1) {
            groupElement.remove();
            updateProcessButton();
        } else {
            showStatusMessage("You need at least one document group.", true);
        }
    });
    
    // Make groups selectable for individual processing
    groupElement.addEventListener('click', function(event) {
        // Don't select if clicking buttons or inputs
        if (event.target.tagName !== 'BUTTON' && event.target.tagName !== 'INPUT') {
            document.querySelectorAll('.file-group').forEach(g => {
                g.style.borderColor = '#ddd';
            });
            this.style.borderColor = '#3e7da6';
            this.style.borderWidth = '2px';
        }
    });
}

// Add a new file group
function addNewGroup() {
    const groupId = 'group' + (document.querySelectorAll('.file-group').length + 1);
    const newGroup = document.createElement('div');
    newGroup.className = 'file-group';
    newGroup.dataset.groupId = groupId;
    
    newGroup.innerHTML = `
        <div class="group-header">
            <input type="text" placeholder="Group Name" value="Group ${groupId}">
            <button class="button-sm remove-group">Remove Group</button>
        </div>
        <div class="file-list">
            <!-- Files will be added here -->
        </div>
        <input type="file" multiple class="file-input" accept=".txt" style="display: none;">
        <button class="add-files">Add Files</button>
    `;
    
    document.getElementById('file-groups-container').appendChild(newGroup);
    setupGroupListeners(newGroup);
    showStatusMessage(`Added new group "${groupId}"`);
}

// Handle file selection
async function handleFileSelection(event, groupElement) {
    const files = event.target.files;
    const fileList = groupElement.querySelector('.file-list');
    
    if (files.length === 0) return;
    
    showStatusMessage(`Loading ${files.length} file(s)...`);
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
            try {
                const content = await readFileContent(file);
                
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.innerHTML = `
                    <span>${file.name}</span>
                    <button class="button-sm remove-file">Remove</button>
                    <input type="hidden" class="file-content" value="${encodeURIComponent(content)}">
                `;
                
                fileList.appendChild(fileItem);
                
                // Add remove file listener
                fileItem.querySelector('.remove-file').addEventListener('click', function() {
                    fileItem.remove();
                    updateProcessButton();
                });
            } catch (error) {
                console.error("Error reading file:", error);
                showStatusMessage(`Error reading file ${file.name}: ${error.message}`, true);
            }
        } else {
            showStatusMessage(`File ${file.name} is not a text file. Only .txt files are supported.`, true);
        }
    }
    
    // Reset file input
    event.target.value = '';
    
    // Update process button state
    updateProcessButton();
    
    showStatusMessage(`Added ${files.length} file(s) successfully.`);
}

// Read file content
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(event) {
            resolve(event.target.result);
        };
        
        reader.onerror = function(error) {
            reject(error);
        };
        
        reader.readAsText(file);
    });
}

// Update the tags display
function updateTagsDisplay() {
    const tagsInput = document.getElementById('tags-input').value;
    const tagsDisplay = document.getElementById('tags-display');
    
    // Clear existing tags
    tagsDisplay.innerHTML = '';
    
    // Split tags by comma and trim whitespace
    const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    // Create tag elements
    tags.forEach(tag => {
        const tagElement = document.createElement('div');
        tagElement.className = 'tag';
        tagElement.textContent = tag;
        tagsDisplay.appendChild(tagElement);
    });
}

// Update process button state
function updateProcessButton() {
    const groups = document.querySelectorAll('.file-group');
    let hasFiles = false;
    
    groups.forEach(group => {
        if (group.querySelectorAll('.file-item').length > 0) {
            hasFiles = true;
        }
    });
    
    document.getElementById('process-button').disabled = !hasFiles;
    document.getElementById('process-single-group').disabled = !hasFiles;
}

// Process a single selected group
async function processSingleGroup() {
    // Find the selected group (with border color)
    const selectedGroup = document.querySelector('.file-group[style*="border-color"]');
    
    if (!selectedGroup) {
        showStatusMessage("Please select a group first by clicking on it.", true);
        return;
    }
    
    // Show loading indicator
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.style.display = 'block';
    
    // Get tags
    const tagsInput = document.getElementById('tags-input').value;
    const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    if (tags.length === 0) {
        showStatusMessage("Please define at least one tag for classification.", true);
        loadingIndicator.style.display = 'none';
        return;
    }
    
    try {
        const groupName = selectedGroup.querySelector('input[type="text"]').value || selectedGroup.dataset.groupId;
        const fileItems = selectedGroup.querySelectorAll('.file-item');
        
        if (fileItems.length === 0) {
            showStatusMessage("Selected group has no files.", true);
            loadingIndicator.style.display = 'none';
            return;
        }
        
        const documents = [];
        fileItems.forEach(fileItem => {
            const fileName = fileItem.querySelector('span').textContent;
            const fileContent = decodeURIComponent(fileItem.querySelector('.file-content').value);
            
            documents.push({
                name: fileName,
                content: fileContent
            });
        });
        
        // Create prompt
        const prompt = `Please classify the following HCI research documents into the most appropriate categories from this list: ${tags.join(', ')}.`;
        
        showStatusMessage(`Processing group "${groupName}" with ${documents.length} documents...`);
        
        // Process this group
        const result = await processDocuments(prompt, documents);
        
        // Clear previous results for this group
        const existingResult = document.querySelector(`.result-group h3[data-group-id="${selectedGroup.dataset.groupId}"]`)?.parentElement;
        if (existingResult) {
            existingResult.remove();
        }
        
        // Display results
        displayGroupResults(groupName, selectedGroup.dataset.groupId, result);
        
        showStatusMessage(`Successfully processed group "${groupName}"`);
    } catch (error) {
        console.error("Error processing group:", error);
        showStatusMessage(`Error: ${error.message}`, true);
    } finally {
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
    }
}

// Process all document groups
async function processAllGroups() {
    // Show loading indicator
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.style.display = 'block';
    
    // Clear previous results
    const resultsContainer = document.getElementById('results-container');
    resultsContainer.innerHTML = '';
    
    // Get tags
    const tagsInput = document.getElementById('tags-input').value;
    const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    if (tags.length === 0) {
        showStatusMessage("Please define at least one tag for classification.", true);
        loadingIndicator.style.display = 'none';
        return;
    }
    
    // Get all groups
    const groups = document.querySelectorAll('.file-group');
    const totalGroups = groups.length;
    let processedGroups = 0;
    
    try {
        for (const group of groups) {
            const groupName = group.querySelector('input[type="text"]').value || group.dataset.groupId;
            const fileItems = group.querySelectorAll('.file-item');
            
            if (fileItems.length === 0) {
                processedGroups++;
                showStatusMessage(`Skipping empty group "${groupName}" (${processedGroups}/${totalGroups})`);
                continue;
            }
            
            const documents = [];
            fileItems.forEach(fileItem => {
                const fileName = fileItem.querySelector('span').textContent;
                const fileContent = decodeURIComponent(fileItem.querySelector('.file-content').value);
                
                documents.push({
                    name: fileName,
                    content: fileContent
                });
            });
            
            // Create prompt
            const prompt = `Please classify the following HCI research documents into the most appropriate categories from this list: ${tags.join(', ')}.`;
            
            showStatusMessage(`Processing group "${groupName}" (${processedGroups + 1}/${totalGroups})...`);
            
            // Process this group
            const result = await processDocuments(prompt, documents);
            
            // Display results
            displayGroupResults(groupName, group.dataset.groupId, result);
            
            processedGroups++;
        }
        
        showStatusMessage(`Successfully processed all groups.`);
    } catch (error) {
        console.error("Error processing documents:", error);
        showStatusMessage(`Error processing documents: ${error.message}`, true);
    } finally {
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
    }
}

// Display results for a group
function displayGroupResults(groupName, groupId, resultText) {
    const resultsContainer = document.getElementById('results-container');
    
    // Create group result element
    const groupResult = document.createElement('div');
    groupResult.className = 'result-group';
    
    // Add group header
    const groupHeader = document.createElement('h3');
    groupHeader.textContent = groupName;
    groupHeader.dataset.groupId = groupId; // Add data attribute for identification
    groupResult.appendChild(groupHeader);
    
    try {
        // Try to parse as JSON
        let resultData;
        
        // Extract JSON from text if needed (handle cases where model might include extra text)
        const jsonMatch = resultText.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        if (jsonMatch) {
            resultData = JSON.parse(jsonMatch[0]);
        } else {
            throw new Error("Could not extract JSON from response");
        }
        
        // Handle both array and single object formats
        if (!Array.isArray(resultData)) {
            resultData = [resultData];
        }
        
        // Add each document result
        resultData.forEach(docResult => {
            const fileResult = document.createElement('div');
            fileResult.className = 'result-file';
            
            const fileName = document.createElement('h4');
            fileName.textContent = docResult.documentName;
            fileResult.appendChild(fileName);
            
            const tagsList = document.createElement('div');
            tagsList.className = 'tags-container';
            
            if (Array.isArray(docResult.assignedTags)) {
                docResult.assignedTags.forEach(tag => {
                    const tagElement = document.createElement('div');
                    tagElement.className = 'tag selected';
                    tagElement.textContent = tag;
                    tagsList.appendChild(tagElement);
                });
            } else if (typeof docResult.assignedTags === 'string') {
                // Handle case where model might return a string instead of array
                const tagElement = document.createElement('div');
                tagElement.className = 'tag selected';
                tagElement.textContent = docResult.assignedTags;
                tagsList.appendChild(tagElement);
            }
            
            fileResult.appendChild(tagsList);
            
            const explanation = document.createElement('p');
            explanation.textContent = docResult.explanation;
            fileResult.appendChild(explanation);
            
            if (docResult.keyTerms && docResult.keyTerms.length) {
                const keyTermsContainer = document.createElement('div');
                keyTermsContainer.innerHTML = `<strong>Key Terms:</strong> ${Array.isArray(docResult.keyTerms) ? docResult.keyTerms.join(", ") : docResult.keyTerms}`;
                fileResult.appendChild(keyTermsContainer);
            }
            
            groupResult.appendChild(fileResult);
        });
    } catch (error) {
        console.error("Error parsing result:", error);
        
        // If parsing failed, show raw text
        const rawResult = document.createElement('pre');
        rawResult.textContent = resultText;
        groupResult.appendChild(rawResult);
    }
    
    // If results container was empty, replace its content
    if (resultsContainer.querySelector('p')?.textContent === 'Results will appear here after processing.') {
        resultsContainer.innerHTML = '';
    }
    
    resultsContainer.appendChild(groupResult);
}