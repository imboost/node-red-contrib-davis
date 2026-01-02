document.addEventListener('DOMContentLoaded', async () => {
    // Check if already installed
    try {
        const res = await fetch('api/status');
        const data = await res.json();
        if (data.installed) {
            window.location.href = 'index.html';
            return;
        }
        // Show page if not installed
        document.body.style.display = 'block';
    } catch (e) {
        console.error('Failed to check status', e);
        // Fallback: Show page if check fails (server might be down/new)
        document.body.style.display = 'block';
    }

    const form = document.querySelector('.auth-form');
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirm-password');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Basic Validation
        if (passwordInput.value !== confirmInput.value) {
            Utils.showToast('Passwords do not match', 'error');
            return;
        }

        const payload = {
            fullname: document.getElementById('fullname').value,
            email: document.getElementById('email').value,
            password: passwordInput.value,
            company: document.getElementById('company').value
        };

        try {
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Installing...';
            btn.disabled = true;

            const res = await fetch('api/install', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.success) {
                // Success
                Utils.showToast('Installation successful!', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } else {
                Utils.showToast(data.message || 'Installation failed', 'error');
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        } catch (err) {
            console.error(err);
            Utils.showToast('An error occurred during installation', 'error');
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = false;
        }
    });
});
