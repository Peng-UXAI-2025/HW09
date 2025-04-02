// Global variables
let notes = [];
let knowledgeTree = null;
let treeVisualization = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI
    initializeUI();
    
    // Event listeners for tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Hide all tab panels
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            // Show selected tab panel
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
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
    
    // Button event listeners
    document.getElementById('add-note-btn').addEventListener('click', addNote);
    document.getElementById('clear-notes-btn').addEventListener('click', clearNotes);
    document.getElementById('generate-btn').addEventListener('click', generateKnowledgeTree);
    document.getElementById('reset-btn').addEventListener('click', resetEverything);
    
    // Export buttons
    document.getElementById('export-json-btn').addEventListener('click', exportAsJSON);
    document.getElementById('export-markdown-btn').addEventListener('click', exportAsMarkdown);
    document.getElementById('export-svg-btn').addEventListener('click', exportSVG);
    
    // Initialize notes textarea with example if empty
    const notesTextarea = document.getElementById('notes-textarea');
    if (!notesTextarea.value) {
        notesTextarea.value = `Reinforcement Learning uses rewards to train agents
Supervised learning requires labeled data
Transformers are used in large language models
Activation functions introduce non-linearity
Backpropagation is used to train neural networks
Convolutional layers are used for image processing
Recurrent Neural Networks handle sequential data
Training data should be representative of the test data
Cross-validation helps prevent overfitting
Batch normalization improves training stability`;
    }
    
    // Enter key in textarea adds the note
    notesTextarea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            addNote();
        }
    });
});

// Initialize UI components
function initializeUI() {
    // Initialize D3 visualization container
    const svg = d3.select("#visualization-container svg");
    
    // Set initial message in visualization
    svg.append("text")
        .attr("x", "50%")
        .attr("y", "50%")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .text("Generate a knowledge tree to see visualization");
}

// Add a note from the textarea
function addNote() {
    const textarea = document.getElementById('notes-textarea');
    const noteText = textarea.value.trim();
    
    if (!noteText) {
        showStatusMessage("Please enter note text", true);
        return;
    }
    
    // Check if there are multiple lines
    const noteLines = noteText.split('\n').filter(line => line.trim());
    
    if (noteLines.length > 1) {
        // Add each line as a separate note
        noteLines.forEach(line => {
            if (line.trim()) {
                addSingleNote(line.trim());
            }
        });
    } else {
        // Add as a single note
        addSingleNote(noteText);
    }
    
    // Clear textarea
    textarea.value = '';
    
    // Update generate button state
    updateGenerateButton();
}

// Add a single note to the list
function addSingleNote(noteText) {
    // Add to notes array
    notes.push(noteText);
    
    // Add to UI
    const notesContainer = document.getElementById('notes-container');
    const noNotesMessage = document.getElementById('no-notes-message');
    
    // Remove "no notes" message if it exists
    if (noNotesMessage) {
        noNotesMessage.style.display = 'none';
    }
    
    // Create note card
    const noteCard = document.createElement('div');
    noteCard.className = 'note-card';
    noteCard.innerHTML = `
        <span class="remove-btn" title="Remove note">&times;</span>
        <p>${noteText}</p>
    `;
    
    // Add remove functionality
    const removeBtn = noteCard.querySelector('.remove-btn');
    removeBtn.addEventListener('click', function() {
        // Remove from array
        const index = notes.indexOf(noteText);
        if (index > -1) {
            notes.splice(index, 1);
        }
        
        // Remove from UI
        noteCard.remove();
        
        // Show "no notes" message if no notes left
        if (notes.length === 0) {
            document.getElementById('no-notes-message').style.display = 'block';
        }
        
        // Update generate button state
        updateGenerateButton();
    });
    
    notesContainer.appendChild(noteCard);
}

// Clear all notes
function clearNotes() {
    if (notes.length === 0) return;
    
    if (confirm('Are you sure you want to clear all notes?')) {
        notes = [];
        const notesContainer = document.getElementById('notes-container');
        notesContainer.innerHTML = '<p id="no-notes-message">No notes added yet.</p>';
        
        // Update generate button state
        updateGenerateButton();
    }
}

// Update generate button state
function updateGenerateButton() {
    const generateBtn = document.getElementById('generate-btn');
    generateBtn.disabled = notes.length === 0;
}

// Generate knowledge tree
async function generateKnowledgeTree() {
    if (notes.length === 0) {
        showStatusMessage("Please add some notes first", true);
        return;
    }
    
    // Show loading indicator
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.style.display = 'block';
    
    // Get structure if defined
    const structureTextarea = document.getElementById('structure-textarea');
    const structure = structureTextarea.value.trim();
    
    try {
        showStatusMessage("Generating knowledge tree...");
        
        // Call API to process notes
        const result = await processNotes(notes, structure);
        
        // Extract JSON from the response
        let jsonData;
        try {
            // Try to find JSON in the response
            const jsonMatch = result.match(/```json\n([\s\S]*?)\n```/) || result.match(/```([\s\S]*?)```/) || result.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                jsonData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            } else {
                throw new Error("Could not extract JSON from response");
            }
        } catch (jsonError) {
            console.error("Error parsing JSON:", jsonError);
            console.log("Raw response:", result);
            throw new Error("Failed to parse knowledge tree structure. Please try again.");
        }
        
        // Store the knowledge tree
        knowledgeTree = jsonData;
        
        // Display the tree visualization
        createVisualization(knowledgeTree);
        
        // Display knowledge details
        displayKnowledgeDetails(knowledgeTree);
        
        showStatusMessage("Knowledge tree generated successfully!");
    } catch (error) {
        console.error("Error generating knowledge tree:", error);
        showStatusMessage(`Error: ${error.message}`, true);
    } finally {
        // Hide loading indicator
        loadingIndicator.style.display = 'none';
    }
}

// Create D3 tree visualization
function createVisualization(data) {
    // Clear previous visualization
    const svg = d3.select("#visualization-container svg");
    svg.selectAll("*").remove();
    
    // Set up dimensions
    const width = svg.node().getBoundingClientRect().width;
    const height = svg.node().getBoundingClientRect().height;
    
    // Create a tree layout
    const treeLayout = d3.tree().size([width - 100, height - 100]);
    
    // Create hierarchy from data
    const root = d3.hierarchy(data);
    
    // Calculate position of each node
    treeLayout(root);
    
    // Add container g element
    const g = svg.append("g")
        .attr("transform", `translate(50, 50)`);
    
    // Create links
    g.selectAll(".link")
        .data(root.links())
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("d", d3.linkHorizontal()
            .x(d => d.y) // Swap x and y for horizontal layout
            .y(d => d.x));
    
    // Create nodes
    const node = g.selectAll(".node")
        .data(root.descendants())
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.y},${d.x})`)
        .on("click", function(event, d) {
            showNodeDetails(d, event);
        });
    
    // Add circles to nodes
    node.append("circle")
        .attr("r", 5);
    
    // Add text labels
    node.append("text")
        .attr("dy", ".35em")
        .attr("x", d => d.children ? -10 : 10)
        .attr("text-anchor", d => d.children ? "end" : "start")
        .text(d => d.data.title);
    
    // Store the visualization for export
    treeVisualization = svg.node();
    
    // Enable zoom and pan
    const zoom = d3.zoom()
        .scaleExtent([0.5, 3])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });
    
    svg.call(zoom);
}

// Show node details when clicked
function showNodeDetails(node, event) {
    const nodeDetails = document.getElementById('node-details');
    
    // Position details near the mouse click
    nodeDetails.style.left = `${event.pageX + 10}px`;
    nodeDetails.style.top = `${event.pageY - 20}px`;
    
    // Fill with content
    let content = `<h3>${node.data.title}</h3>`;
    
    if (node.data.summary) {
        content += `<p><strong>Summary:</strong> ${node.data.summary}</p>`;
    }
    
    if (node.data.content) {
        content += `<p><strong>Content:</strong> ${node.data.content}</p>`;
    }
    
    nodeDetails.innerHTML = content;
    nodeDetails.style.display = 'block';
    
    // Close when clicking elsewhere
    document.addEventListener('click', closeNodeDetails, { once: true });
}

// Close node details panel
function closeNodeDetails(event) {
    if (!event.target.closest('.node') && !event.target.closest('#node-details')) {
        document.getElementById('node-details').style.display = 'none';
    } else {
        // If clicked on node or details, set up another listener
        document.addEventListener('click', closeNodeDetails, { once: true });
    }
}

// Display knowledge details in text form
function displayKnowledgeDetails(data) {
    const detailsContainer = document.getElementById('knowledge-details');
    detailsContainer.innerHTML = '';
    
    // Add main topic
    const mainInfo = document.createElement('div');
    mainInfo.className = 'knowledge-info';
    
    mainInfo.innerHTML = `
        <h3>${data.title}</h3>
        <div class="knowledge-summary">${data.summary}</div>
    `;
    
    detailsContainer.appendChild(mainInfo);
    
    // Recursively add child categories
    if (data.children && data.children.length > 0) {
        addChildDetails(data.children, detailsContainer, 0);
    }
}

// Add child details recursively
function addChildDetails(children, container, level) {
    children.forEach(child => {
        const childElement = document.createElement('div');
        childElement.className = 'knowledge-detail';
        childElement.style.marginLeft = `${level * 20}px`;
        
        childElement.innerHTML = `
            <div class="knowledge-title">${child.title}</div>
            <div class="knowledge-summary">${child.summary}</div>
            ${child.content ? `<div class="knowledge-content">${child.content}</div>` : ''}
        `;
        
        container.appendChild(childElement);
        
        // Add children recursively
        if (child.children && child.children.length > 0) {
            addChildDetails(child.children, container, level + 1);
        }
    });
}

// Reset everything
function resetEverything() {
    if (confirm('Are you sure you want to reset everything? This will clear all notes and the generated knowledge tree.')) {
        // Clear notes
        notes = [];
        const notesContainer = document.getElementById('notes-container');
        notesContainer.innerHTML = '<p id="no-notes-message">No notes added yet.</p>';
        
        // Clear structure textarea
        document.getElementById('structure-textarea').value = '';
        
        // Clear visualization
        const svg = d3.select("#visualization-container svg");
        svg.selectAll("*").remove();
        
        // Add initial message
        svg.append("text")
            .attr("x", "50%")
            .attr("y", "50%")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .text("Generate a knowledge tree to see visualization");
        
        // Clear knowledge details
        document.getElementById('knowledge-details').innerHTML = '<p>Generate a knowledge tree to see detailed information.</p>';
        
        // Clear knowledge tree data
        knowledgeTree = null;
        
        // Update generate button state
        updateGenerateButton();
        
        showStatusMessage("Everything has been reset");
    }
}

// Export as JSON
function exportAsJSON() {
    if (!knowledgeTree) {
        showStatusMessage("No knowledge tree to export", true);
        return;
    }
    
    const jsonString = JSON.stringify(knowledgeTree, null, 2);
    downloadFile(jsonString, 'knowledge-tree.json', 'application/json');
}

// Export as Markdown
function exportAsMarkdown() {
    if (!knowledgeTree) {
        showStatusMessage("No knowledge tree to export", true);
        return;
    }
    
    let markdown = `# ${knowledgeTree.title}\n\n`;
    markdown += `${knowledgeTree.summary}\n\n`;
    
    // Recursively add child nodes
    function addChildToMarkdown(node, level) {
        let result = '';
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                // Add heading with appropriate level
                result += `\n${'#'.repeat(level + 2)} ${child.title}\n\n`;
                
                // Add summary and content
                result += `${child.summary}\n\n`;
                if (child.content) {
                    result += `${child.content}\n\n`;
                }
                
                // Add children recursively
                result += addChildToMarkdown(child, level + 1);
            });
        }
        return result;
    }
    
    markdown += addChildToMarkdown(knowledgeTree, 0);
    
    downloadFile(markdown, 'knowledge-tree.md', 'text/markdown');
}

// Export SVG
function exportSVG() {
    if (!treeVisualization) {
        showStatusMessage("No visualization to export", true);
        return;
    }
    
    // Clone the SVG to avoid modifying the original
    const clonedSvg = treeVisualization.cloneNode(true);
    
    // Add inline stylesheet
    const style = document.createElement('style');
    style.textContent = `
        .node circle {
            fill: #557ba1;
            stroke: #233749;
            stroke-width: 1.5px;
        }
        .node text {
            font: 12px sans-serif;
        }
        .link {
            fill: none;
            stroke: #ccc;
            stroke-width: 1.5px;
        }
    `;
    clonedSvg.insertBefore(style, clonedSvg.firstChild);
    
    // Convert to string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);
    
    // Download
    downloadFile(svgString, 'knowledge-tree.svg', 'image/svg+xml');
}

// Helper function to download files
function downloadFile(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 100);
}