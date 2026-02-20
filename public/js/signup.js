const signupForm = document.getElementById('signup-form');
const signupStatus = document.getElementById('signup-status');

if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    signupStatus.textContent = 'Creating your account...';
    signupStatus.className = 'status';

    const formData = new FormData(signupForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        signupStatus.textContent = data.message || 'Signup failed.';
        signupStatus.className = 'status error';
        return;
      }

      signupStatus.textContent =
        data.message || 'Signup successful. Please check your email to verify.';
      signupStatus.className = 'status success';
      signupForm.reset();
    } catch (error) {
      signupStatus.textContent = 'Something went wrong. Please try again.';
      signupStatus.className = 'status error';
    }
  });
}

