/*
Copyright 2025 The Heimdall Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// Global variables
let currentItemData = null;
let currentItemType = null;
let hasChanges = false;

// DOM elements
const loadingOverlay = document.getElementById('loadingOverlay');
const detailForm = document.getElementById('detailForm');
const detailTitle = document.getElementById('detailTitle');
const statusInfo = document.getElementById('statusInfo');
const validationInfo = document.getElementById('validationInfo');

// Buttons
const saveBtn = document.getElementById('saveBtn');
const closeBtn = document.getElementById('closeBtn');
const addReferenceBtn = document.getElementById('addReferenceBtn');
const addPropertyBtn = document.getElementById('addPropertyBtn');

// Form fields
const nameField = document.getElementById('name');
const versionField = document.getElementById('version');
const typeField = document.getElementById('type');
const bomRefField = document.getElementById('bomRef');
const purlField = document.getElementById('purl');
const cpeField = document.getElementById('cpe');
const groupField = document.getElementById('group');
const descriptionField = document.getElementById('description');
const licenseField = document.getElementById('license');
const licenseTextField = document.getElementById('licenseText');

// Containers
const externalReferencesContainer = document.getElementById('externalReferences');
const propertiesContainer = document.getElementById('properties');

// Initialize the detail window
function init() {
    setupEventListeners();
    listenForItemData();
}

// Setup event listeners
function setupEventListeners() {
    saveBtn.addEventListener('click', saveChanges);
    closeBtn.addEventListener('click', closeWindow);
    
    // Add dynamic elements
    addReferenceBtn.addEventListener('click', addReference);
    addPropertyBtn.addEventListener('click', addProperty);
    
    // Form field change detection
    const formFields = [
        nameField, versionField, typeField, purlField, cpeField, 
        groupField, descriptionField, licenseField, licenseTextField
    ];
    
    formFields.forEach(field => {
        field.addEventListener('input', markAsChanged);
    });
    
    // Prevent accidental navigation
    window.addEventListener('beforeunload', (e) => {
        if (hasChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

// Listen for item data from main process
function listenForItemData() {
    window.heimdallAPI.onItemData((data) => {
        currentItemData = data.itemData;
        currentItemType = data.itemType;
        loadItemData();
    });
}

// Load item data into form
function loadItemData() {
    if (!currentItemData) return;
    
    showLoading();
    
    try {
        if (currentItemType === 'sbom') {
            // Handle SBOM data
            detailTitle.textContent = `SBOM Details - ${currentItemData.metadata?.component?.name || 'Software Bill of Materials'}`;
            
            // SBOM-specific fields
            nameField.value = currentItemData.metadata?.component?.name || '';
            versionField.value = currentItemData.metadata?.component?.version || '';
            typeField.value = currentItemData.metadata?.component?.type || '';
            bomRefField.value = currentItemData.metadata?.component?.bomRef || '';
            
            // Package information (from metadata component)
            purlField.value = currentItemData.metadata?.component?.purl || '';
            cpeField.value = currentItemData.metadata?.component?.cpe || '';
            groupField.value = currentItemData.metadata?.component?.group || '';
            descriptionField.value = currentItemData.metadata?.component?.description || '';
            
            // Licensing (from metadata component)
            if (currentItemData.metadata?.component?.licenses && currentItemData.metadata.component.licenses.length > 0) {
                const license = currentItemData.metadata.component.licenses[0];
                licenseField.value = license.license?.id || license.expression || '';
                licenseTextField.value = license.license?.text || '';
            } else {
                licenseField.value = '';
                licenseTextField.value = '';
            }
            
            // External references (from metadata component)
            loadExternalReferences();
            
            // Properties (from metadata component)
            loadProperties();
            
        } else {
            // Handle component data (existing logic)
            detailTitle.textContent = `${currentItemType.charAt(0).toUpperCase() + currentItemType.slice(1)} Details - ${currentItemData.name || currentItemData.bomRef || 'Unknown'}`;
            
            // Basic information
            nameField.value = currentItemData.name || '';
            versionField.value = currentItemData.version || '';
            typeField.value = currentItemData.type || '';
            bomRefField.value = currentItemData.bomRef || '';
            
            // Package information
            purlField.value = currentItemData.purl || '';
            cpeField.value = currentItemData.cpe || '';
            groupField.value = currentItemData.group || '';
            descriptionField.value = currentItemData.description || '';
            
            // Licensing
            if (currentItemData.licenses && currentItemData.licenses.length > 0) {
                const license = currentItemData.licenses[0];
                licenseField.value = license.license?.id || license.expression || '';
                licenseTextField.value = license.license?.text || '';
            } else {
                licenseField.value = '';
                licenseTextField.value = '';
            }
            
            // External references
            loadExternalReferences();
            
            // Properties
            loadProperties();
        }
        
        hasChanges = false;
        showForm();
        
    } catch (error) {
        showError(`Failed to load ${currentItemType}: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Load external references
function loadExternalReferences() {
    externalReferencesContainer.innerHTML = '';
    
    let references = [];
    if (currentItemType === 'sbom') {
        references = currentItemData.metadata?.component?.externalReferences || [];
    } else {
        references = currentItemData.externalReferences || [];
    }
    
    if (references.length === 0) {
        addReference(); // Add one empty reference
        return;
    }
    
    references.forEach(ref => {
        addReference(ref);
    });
}

// Load properties
function loadProperties() {
    propertiesContainer.innerHTML = '';
    
    let properties = [];
    if (currentItemType === 'sbom') {
        properties = currentItemData.metadata?.component?.properties || [];
    } else {
        properties = currentItemData.properties || [];
    }
    
    if (properties.length === 0) {
        addProperty(); // Add one empty property
        return;
    }
    
    properties.forEach(prop => {
        addProperty(prop);
    });
}

// Add external reference
function addReference(data = null) {
    const referenceItem = document.createElement('div');
    referenceItem.className = 'reference-item';
    
    referenceItem.innerHTML = `
        <div class="form-grid">
            <div class="form-group">
                <label>Type</label>
                <select class="ref-type">
                    <option value="website">Website</option>
                    <option value="issue-tracker">Issue Tracker</option>
                    <option value="vcs">Version Control System</option>
                    <option value="ci-build">CI Build</option>
                    <option value="quality-gate">Quality Gate</option>
                    <option value="advisories">Security Advisories</option>
                    <option value="bom">BOM</option>
                    <option value="mailing-list">Mailing List</option>
                    <option value="social">Social</option>
                    <option value="chat">Chat</option>
                    <option value="documentation">Documentation</option>
                    <option value="support">Support</option>
                    <option value="distribution">Distribution</option>
                    <option value="license">License</option>
                    <option value="build-meta">Build Meta</option>
                    <option value="build-system">Build System</option>
                    <option value="release-notes">Release Notes</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label>URL</label>
                <input type="url" class="ref-url" placeholder="https://example.com">
            </div>
            <div class="form-group">
                <label>Comment</label>
                <input type="text" class="ref-comment" placeholder="Optional comment">
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-danger btn-small remove-ref">Remove</button>
            </div>
        </div>
    `;
    
    // Set values if data provided
    if (data) {
        const typeSelect = referenceItem.querySelector('.ref-type');
        const urlInput = referenceItem.querySelector('.ref-url');
        const commentInput = referenceItem.querySelector('.ref-comment');
        
        typeSelect.value = data.type || 'website';
        urlInput.value = data.url || '';
        commentInput.value = data.comment || '';
    }
    
    // Add event listeners
    const removeBtn = referenceItem.querySelector('.remove-ref');
    removeBtn.addEventListener('click', () => {
        referenceItem.remove();
        markAsChanged();
    });
    
    // Add change detection
    const inputs = referenceItem.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('input', markAsChanged);
    });
    
    externalReferencesContainer.appendChild(referenceItem);
}

// Add property
function addProperty(data = null) {
    const propertyItem = document.createElement('div');
    propertyItem.className = 'property-item';
    
    propertyItem.innerHTML = `
        <div class="form-grid">
            <div class="form-group">
                <label>Name</label>
                <input type="text" class="prop-name" placeholder="Property name">
            </div>
            <div class="form-group">
                <label>Value</label>
                <input type="text" class="prop-value" placeholder="Property value">
            </div>
            <div class="form-group">
                <button type="button" class="btn btn-danger btn-small remove-prop">Remove</button>
            </div>
        </div>
    `;
    
    // Set values if data provided
    if (data) {
        const nameInput = propertyItem.querySelector('.prop-name');
        const valueInput = propertyItem.querySelector('.prop-value');
        
        nameInput.value = data.name || '';
        valueInput.value = data.value || '';
    }
    
    // Add event listeners
    const removeBtn = propertyItem.querySelector('.remove-prop');
    removeBtn.addEventListener('click', () => {
        propertyItem.remove();
        markAsChanged();
    });
    
    // Add change detection
    const inputs = propertyItem.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', markAsChanged);
    });
    
    propertiesContainer.appendChild(propertyItem);
}

// Collect form data
function collectFormData() {
    const formData = {
        name: nameField.value.trim(),
        version: versionField.value.trim(),
        type: typeField.value,
        bomRef: bomRefField.value.trim(),
        purl: purlField.value.trim(),
        cpe: cpeField.value.trim(),
        group: groupField.value.trim(),
        description: descriptionField.value.trim()
    };
    
    // Collect licenses
    if (licenseField.value || licenseTextField.value) {
        formData.licenses = [{
            license: {
                id: licenseField.value || undefined,
                text: licenseTextField.value || undefined
            }
        }];
    }
    
    // Collect external references
    const references = [];
    const referenceItems = externalReferencesContainer.querySelectorAll('.reference-item');
    referenceItems.forEach(item => {
        const type = item.querySelector('.ref-type').value;
        const url = item.querySelector('.ref-url').value.trim();
        const comment = item.querySelector('.ref-comment').value.trim();
        
        if (url) {
            references.push({
                type: type,
                url: url,
                comment: comment || undefined
            });
        }
    });
    
    if (references.length > 0) {
        formData.externalReferences = references;
    }
    
    // Collect properties
    const properties = [];
    const propertyItems = propertiesContainer.querySelectorAll('.property-item');
    propertyItems.forEach(item => {
        const name = item.querySelector('.prop-name').value.trim();
        const value = item.querySelector('.prop-value').value.trim();
        
        if (name && value) {
            properties.push({
                name: name,
                value: value
            });
        }
    });
    
    if (properties.length > 0) {
        formData.properties = properties;
    }
    
    return formData;
}

// Validate form data
function validateFormData(formData) {
    const errors = [];
    
    if (!formData.name) {
        errors.push('Name is required');
    }
    
    if (!formData.type) {
        errors.push('Type is required');
    }
    
    // Validate PURL format if provided
    if (formData.purl && !isValidPURL(formData.purl)) {
        errors.push('Invalid Package URL (PURL) format');
    }
    
    // Validate CPE format if provided
    if (formData.cpe && !isValidCPE(formData.cpe)) {
        errors.push('Invalid CPE format');
    }
    
    return errors;
}

// Validate PURL format
function isValidPURL(purl) {
    // Basic PURL validation - can be enhanced
    const purlRegex = /^pkg:[a-zA-Z0-9][a-zA-Z0-9.-]*\/[^@]+(@[^#]+)?(#.+)?$/;
    return purlRegex.test(purl);
}

// Validate CPE format
function isValidCPE(cpe) {
    // Basic CPE validation - can be enhanced
    const cpeRegex = /^cpe:2\.3:[aho\*\-](:(((\?*|\*?)([a-zA-Z0-9\-\._]|(\\[\\\*\?!"#$$%&'\(\)\+,/:;<=>@\[\]\^`\{\|}~]))+(\?*|\*?))|[\*\-])){5}(:(([a-zA-Z]{2,3}(-([a-zA-Z]{2}|[0-9]{3}))?)|[\*\-]))(:(((\?*|\*?)([a-zA-Z0-9\-\._]|(\\[\\\*\?!"#$$%&'\(\)\+,/:;<=>@\[\]\^`\{\|}~]))+(\?*|\*?))|[\*\-])){4}$/;
    return cpeRegex.test(cpe);
}

// Save changes
async function saveChanges() {
    try {
        const formData = collectFormData();
        const errors = validateFormData(formData);
        
        if (errors.length > 0) {
            showValidationErrors(errors);
            return;
        }
        
        showLoading();
        
        // Update the item data
        let updatedData;
        if (currentItemType === 'sbom') {
            // For SBOM, update the metadata.component section
            updatedData = { ...currentItemData };
            if (!updatedData.metadata) {
                updatedData.metadata = {};
            }
            updatedData.metadata.component = { ...updatedData.metadata.component, ...formData };
        } else {
            // For components, update the root level
            updatedData = { ...currentItemData, ...formData };
        }
        
        // Send update to main process
        await window.heimdallAPI.updateItem(currentItemData, currentItemType, updatedData);
        
        hasChanges = false;
        showStatus('Changes saved successfully');
        hideValidationErrors();
        
    } catch (error) {
        showError(`Failed to save changes: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Close window
function closeWindow() {
    if (hasChanges) {
        const confirmed = confirm('You have unsaved changes. Are you sure you want to close?');
        if (!confirmed) return;
    }
    
    window.close();
}

// Mark form as changed
function markAsChanged() {
    hasChanges = true;
    saveBtn.disabled = false;
    showStatus('Unsaved changes');
}

// UI helpers
function showLoading() {
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

function showForm() {
    detailForm.classList.remove('hidden');
}

function showStatus(message) {
    statusInfo.textContent = message;
    setTimeout(() => {
        statusInfo.textContent = 'Ready';
    }, 3000);
}

function showError(message) {
    statusInfo.textContent = `Error: ${message}`;
    setTimeout(() => {
        statusInfo.textContent = 'Ready';
    }, 5000);
}

function showValidationErrors(errors) {
    validationInfo.textContent = errors.join(', ');
    validationInfo.classList.remove('valid');
}

function hideValidationErrors() {
    validationInfo.textContent = '';
    validationInfo.classList.add('valid');
}

// Initialize the detail window when the page loads
document.addEventListener('DOMContentLoaded', init); 