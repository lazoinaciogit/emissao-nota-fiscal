const form = document.getElementById('nf-form') as HTMLFormElement;
const cpfInput = document.getElementById('cpf') as HTMLInputElement;
const cepInput = document.getElementById('cep') as HTMLInputElement;
const shareButton = document.getElementById('share-button') as HTMLButtonElement;
const toast = document.getElementById('toast') as HTMLDivElement;
const toastMessage = document.getElementById('toast-message') as HTMLParagraphElement;
const valorInput = document.getElementById('valor') as HTMLInputElement;
const valorButtons = document.querySelectorAll('.valor-btn') as NodeListOf<HTMLButtonElement>;


// --- MÁSCARAS DE INPUT ---
const applyMask = (input: HTMLInputElement, maskFunction: (value: string) => string) => {
    input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const originalValue = target.value;
        const maskedValue = maskFunction(originalValue);
        if (originalValue !== maskedValue) {
           target.value = maskedValue;
        }
    });
};

const cpfMask = (value: string): string => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
        .slice(0, 14);
};

const cepMask = (value: string): string => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .slice(0, 9);
};

const currencyMask = (value: string): string => {
    if (!value) return '';
    let v = value.replace(/\D/g, '');
    if (v.length === 0) return '';
    
    // Treat the input as cents
    const num = parseInt(v, 10) / 100;

    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(num);
};

applyMask(cpfInput, cpfMask);
applyMask(cepInput, cepMask);
applyMask(valorInput, currencyMask);

// --- LÓGICA DO VALOR ---
valorButtons.forEach(button => {
    button.addEventListener('click', () => {
        const value = button.dataset.value || '';
        valorInput.value = value;
        // Trigger input event to update active states
        valorInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
});

valorInput.addEventListener('input', () => {
    const currentValue = valorInput.value;
    valorButtons.forEach(btn => {
        if (btn.dataset.value === currentValue) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
});


// --- BUSCA DE CEP ---
const clearAddressForm = () => {
    (document.getElementById('logradouro') as HTMLInputElement).value = '';
    (document.getElementById('bairro') as HTMLInputElement).value = '';
    (document.getElementById('cidade') as HTMLInputElement).value = '';
    (document.getElementById('uf') as HTMLInputElement).value = '';
};

const fillAddressForm = (data: any) => {
    (document.getElementById('logradouro') as HTMLInputElement).value = data.logradouro || '';
    (document.getElementById('bairro') as HTMLInputElement).value = data.bairro || '';
    (document.getElementById('cidade') as HTMLInputElement).value = data.localidade || '';
    (document.getElementById('uf') as HTMLInputElement).value = data.uf || '';
};

const fetchCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    const url = `https://viacep.com.br/ws/${cleanCep}/json/`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.erro) {
            showToast('CEP não encontrado.', true);
            clearAddressForm();
        } else {
            fillAddressForm(data);
            (document.getElementById('numero') as HTMLInputElement).focus();
        }
    } catch (error) {
        showToast('Não foi possível buscar o CEP.', true);
        clearAddressForm();
    }
};

cepInput.addEventListener('blur', (e) => fetchCep((e.target as HTMLInputElement).value));

// --- NOTIFICAÇÕES (TOAST) ---
function showToast(message: string, isError = false) {
    toastMessage.innerText = message;
    toast.className = `fixed top-5 right-5 px-6 py-3 rounded-lg text-white shadow-lg transition-transform transform translate-x-0 ${isError ? 'bg-red-500' : 'bg-green-500'}`;
    setTimeout(() => {
        toast.className = toast.className.replace('translate-x-0', 'translate-x-[150%]');
    }, 3000);
}

// --- COMPARTILHAMENTO WHATSAPP ---
shareButton.addEventListener('click', () => {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;

    // Validação
    const requiredFields = ['cpf', 'nome', 'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'uf', 'paciente', 'valor'];
    for (const field of requiredFields) {
        if (!data[field]) {
            showToast('Por favor, preencha todos os campos.', true);
            const el = document.getElementById(field);
            if (el) el.focus();
            return;
        }
    }


    if (data.cpf.replace(/\D/g, '').length !== 11) {
        showToast('CPF inválido. Deve conter 11 dígitos.', true);
        return;
    }
    if (data.cep.replace(/\D/g, '').length !== 8) {
        showToast('CEP inválido. Deve conter 8 dígitos.', true);
        return;
    }

    const phoneNumber = "557188511792";
    const introMessage = "Olá! Encaminho os dados para emissão de nota fiscal, conforme solicitado pelo Dr. Lázaro:";

    const fullAddress = `${data.logradouro}, ${data.numero}, ${data.bairro}, ${data.cidade} - ${data.uf}`;

    const message = `${introMessage}

*CPF (Titular):* ${data.cpf}
*Nome Completo (Titular):* ${data.nome}
*Endereço Completo:* ${fullAddress}
*CEP:* ${data.cep}
*Paciente:* ${data.paciente}
*Valor da NF:* R$ ${data.valor}
*Descrição da NF:* Consulta de Neuropediatria realizada por Dr. LÁZARO INÁCIO ARAÚJO RODRIGUES, CREMEB 27353.`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
});