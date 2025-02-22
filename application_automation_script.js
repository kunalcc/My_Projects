// First, remove any existing instance
if (window.formTracker) {
    document.getElementById('form-tracker-status')?.remove();
    window.formTracker = null;
}

class FormLearningTracker {
    constructor() {
        this.knowledgeBase = this.loadKnowledgeBase();
        this.isTracking = false;
        this.init();
        this.createStatusDisplay();
        this.watchForNewForms();
    }

    loadKnowledgeBase() {
        try {
            const saved = localStorage.getItem('formLearningData');
            return saved ? JSON.parse(saved) : {
                fieldPatterns: {},
                userValues: {},
                formCount: 0
            };
        } catch (error) {
            console.error('Error loading knowledge base:', error);
            return {
                fieldPatterns: {},
                userValues: {},
                formCount: 0
            };
        }
    }

    saveKnowledgeBase() {
        try {
            localStorage.setItem('formLearningData', JSON.stringify(this.knowledgeBase));
            this.updateStatus('Knowledge base updated');
        } catch (error) {
            console.error('Error saving knowledge base:', error);
            this.updateStatus('Error saving data');
        }
    }

    init() {
        // Track form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.tagName === 'FORM') {
                this.handleFormSubmission(e.target);
            }
        });

        // Track input changes
        document.addEventListener('change', (e) => {
            if (this.isFormElement(e.target)) {
                this.learnFromInput(e.target);
            }
        });
    }

    createStatusDisplay() {
        const status = document.createElement('div');
        status.id = 'form-tracker-status';
        status.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 15px;
            border-radius: 8px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            max-width: 300px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;

        const content = document.createElement('div');
        content.id = 'form-tracker-content';
        status.appendChild(content);

        document.body.appendChild(status);
        this.statusElement = content;
        this.updateStatus('Form tracker initialized');
    }

    updateStatus(message) {
        if (this.statusElement) {
            const timestamp = new Date().toLocaleTimeString();
            this.statusElement.innerHTML = `
                <strong>Form Tracker Status</strong><br>
                <small>${timestamp}</small><br>
                ${message}<br><br>
                <strong>Learned Fields:</strong> ${Object.keys(this.knowledgeBase.fieldPatterns).length}<br>
                <strong>Forms Tracked:</strong> ${this.knowledgeBase.formCount}
            `;
        }
    }

    watchForNewForms() {
        // Initial check
        this.checkForForms();

        // Watch for new forms
        const observer = new MutationObserver(() => this.checkForForms());
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    checkForForms() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            if (!form.dataset.formTrackerChecked) {
                form.dataset.formTrackerChecked = 'true';
                this.addFormButtons(form);
                this.checkFormFields(form);
            }
        });
    }

    isFormElement(element) {
        return element.tagName === 'INPUT' || 
               element.tagName === 'SELECT' || 
               element.tagName === 'TEXTAREA';
    }

    getFieldIdentifiers(field) {
        return {
            id: field.id,
            name: field.name,
            type: field.type,
            placeholder: field.placeholder,
            classList: Array.from(field.classList)
        };
    }

    generateFieldKey(fieldInfo) {
        const identifiers = [
            fieldInfo.id,
            fieldInfo.name,
            fieldInfo.placeholder
        ].filter(Boolean);
        return identifiers.join('_').toLowerCase().replace(/[^a-z0-9_]/g, '_');
    }

    learnFromInput(field) {
        const value = field.value;
        if (!value || field.type === 'password') return;

        const fieldInfo = this.getFieldIdentifiers(field);
        const fieldKey = this.generateFieldKey(fieldInfo);

        this.knowledgeBase.fieldPatterns[fieldKey] = {
            identifiers: fieldInfo,
            lastValue: value,
            occurrences: (this.knowledgeBase.fieldPatterns[fieldKey]?.occurrences || 0) + 1
        };

        this.saveKnowledgeBase();
        this.updateStatus(`Learned new value for: ${fieldInfo.name || fieldInfo.id || 'field'}`);
    }

    suggestValue(field) {
        const fieldInfo = this.getFieldIdentifiers(field);
        const fieldKey = this.generateFieldKey(fieldInfo);
        return this.knowledgeBase.fieldPatterns[fieldKey]?.lastValue;
    }

    handleFormSubmission(form) {
        this.knowledgeBase.formCount++;
        this.saveKnowledgeBase();
        this.updateStatus('Form submitted - data saved');
    }

    addFormButtons(form) {
        const container = document.createElement('div');
        container.style.cssText = 'margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px;';

        const fillButton = document.createElement('button');
        fillButton.textContent = 'Auto-fill Form';
        fillButton.style.cssText = 'margin-right: 10px; padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer;';
        fillButton.onclick = () => this.autoFillForm(form);

        container.appendChild(fillButton);
        form.insertBefore(container, form.firstChild);
    }

    autoFillForm(form) {
        let filledCount = 0;
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            const suggestion = this.suggestValue(input);
            if (suggestion && input.type !== 'password') {
                input.value = suggestion;
                input.style.backgroundColor = '#e6ffe6';
                setTimeout(() => input.style.backgroundColor = '', 1000);
                filledCount++;
            }
        });

        this.updateStatus(`Auto-filled ${filledCount} fields`);
    }

    checkFormFields(form) {
        const inputs = form.querySelectorAll('input, select, textarea');
        let hasData = false;

        inputs.forEach(input => {
            if (this.suggestValue(input)) {
                hasData = true;
                input.style.border = '2px solid #4CAF50';
            }
        });

        if (hasData) {
            this.updateStatus('Found fields with saved data');
        }
    }
}

// Create and store the instance globally
window.formTracker = new FormLearningTracker();

console.log('Form Tracker installed! Look for the status window in the bottom-right corner.');