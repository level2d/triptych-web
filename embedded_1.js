console.log('Embedded script loaded');

// Create a new div and insert it before the closing </body> tag
var newDiv = document.createElement('div');
newDiv.id = 'custom-embed-div'; // Optional: set an ID
newDiv.textContent = 'This is the new div before </body>';

// Insert as the first child of <body>
document.body.appendChild(newDiv);
