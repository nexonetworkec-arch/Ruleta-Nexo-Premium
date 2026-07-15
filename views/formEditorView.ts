import { StateManager } from '../core';

export const renderFormFieldsEditor = () => {
    const container = document.getElementById('formFieldsEditor');
    if (!container) return;
    container.innerHTML = StateManager.config.formFields.map((field) => `
        <div class="field-editor-item">
            <button class="btn-remove-field" onclick="removeFormField('${field.id}')">X</button>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label style="font-size: 0.55rem; color: var(--gold); font-weight: 800;">ETIQUETA</label>
                    <input type="text" class="input-pin" style="padding: 10px; font-size: 0.75rem;" value="${field.label}" oninput="updateFormField('${field.id}', 'label', this.value)">
                </div>
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <label style="font-size: 0.55rem; color: var(--gold); font-weight: 800;">PLACEHOLDER</label>
                    <input type="text" class="input-pin" style="padding: 10px; font-size: 0.75rem;" value="${field.placeholder}" oninput="updateFormField('${field.id}', 'placeholder', this.value)">
                </div>
            </div>
        </div>
    `).join("");
};

export const updateFormField = (id: string, prop: 'label' | 'placeholder', val: string) => {
    const field = StateManager.config.formFields.find(f => f.id === id);
    if (field) {
        field[prop] = val;
        StateManager.save();
    }
};

export const removeFormField = (
    id: string, 
    showCustomAlert: (msg: string, title: string) => void
) => {
    if (StateManager.config.formFields.length <= 1) {
        return showCustomAlert("Mínimo debe haber 1 campo.", "ATENCIÓN");
    }
    StateManager.config.formFields = StateManager.config.formFields.filter(f => f.id !== id);
    StateManager.save();
    renderFormFieldsEditor();
};

export const renderDynamicRegistrationForm = () => {
    const container = document.getElementById('formRegistrationDynamic');
    if (!container) return;
    container.innerHTML = StateManager.config.formFields.map(field => {
        const searchStr = (field.id + " " + field.label).toLowerCase();
        const isPhone = searchStr.includes('tel') || searchStr.includes('cel') || searchStr.includes('whatsapp') || searchStr.includes('phone') || searchStr.includes('móvil') || searchStr.includes('movil');
        const typeAttr = isPhone ? 'tel' : 'text';
        const modeAttr = isPhone ? ' inputmode="tel"' : '';
        
        return `
        <div class="input-group">
            <label>${field.label}</label>
            <input type="${typeAttr}" id="reg_${field.id}" class="input-pin" placeholder="${field.placeholder}"${modeAttr}>
        </div>
        `;
    }).join("");
};
