document.addEventListener('DOMContentLoaded', async () => {
    // Check if installed
    try {
        const res = await fetch('api/status');
        const data = await res.json();
        if (!data.installed) {
            window.location.href = 'install.html';
            return;
        } else {
            // Hide install link if already installed
            const installLink = document.querySelector('a[href="install.html"]');
            if (installLink) {
                const p = installLink.closest('p');
                if (p) p.style.display = 'none';
            }
        }
    } catch (e) {
        console.error('Failed to check status', e);
    }

    const form = document.querySelector('.auth-form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
            email: document.getElementById('email').value,
            password: document.getElementById('password').value
        };

        try {
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Signing In...';
            btn.disabled = true;

            const res = await fetch('api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.success) {
                // Save session
                localStorage.setItem('microbase_user', JSON.stringify(data.user));
                window.location.href = 'home.html';
            } else {
                Utils.showToast(data.message || 'Login failed', 'error');
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        } catch (err) {
            console.error(err);
            Utils.showToast('An error occurred during login', 'error');
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = false;
        }
    });
});
