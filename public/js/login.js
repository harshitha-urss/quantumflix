const loginForm = document.getElementById('login-form');
const loginStatus = document.getElementById('login-status');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    loginStatus.textContent = 'Checking your credentials...';
    loginStatus.className = 'status';

    const formData = new FormData(loginForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        loginStatus.textContent = data.message || 'Login failed.';
        loginStatus.className = 'status error';
        return;
      }

      loginStatus.textContent = data.message || 'Login successful. Redirecting...';
      loginStatus.className = 'status success';

      setTimeout(() => {
        window.location.href = '/landing.html';
      }, 800);
    } catch (error) {
      loginStatus.textContent = 'Something went wrong. Please try again.';
      loginStatus.className = 'status error';
    }
  });
}

