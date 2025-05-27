from flask import Flask, render_template, request, redirect, url_for, flash, session

app = Flask(__name__)
app.secret_key = 'yoursecretkey'

# Dummy user for testing
users = {
    'admin': {'password': 'admin123'}
}

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        uname = request.form['username']
        passwd = request.form['password']
        # Replace with real authentication logic
        if uname in users and users[uname]['password'] == passwd:
            session['user'] = uname
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password')
            return redirect(url_for('login'))
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    if 'user' not in session:
        return redirect(url_for('login'))
    return f"Welcome {session['user']}! This is the control dashboard."

if __name__ == '__main__':
    app.run(debug=True)
