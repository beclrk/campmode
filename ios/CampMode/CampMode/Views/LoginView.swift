import SwiftUI
import AuthenticationServices

enum LoginMode { case choose, signIn, signUpEmail, signUpPassword }

struct LoginView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @State private var mode: LoginMode = .choose
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    
    var body: some View {
        ZStack {
            Color(red: 0.05, green: 0.05, blue: 0.05).ignoresSafeArea()
            LinearGradient(colors: [.green.opacity(0.1), .clear], startPoint: .topLeading, endPoint: .bottomTrailing)
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                Spacer()
                
                // Logo
                VStack(spacing: 16) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 24)
                            .fill(LinearGradient(colors: [.green, .green.opacity(0.8)], startPoint: .topLeading, endPoint: .bottomTrailing))
                            .frame(width: 80, height: 80)
                            .shadow(color: .green.opacity(0.3), radius: 12)
                        Image(systemName: "tent")
                            .font(.system(size: 36))
                            .foregroundColor(.white)
                    }
                    Text("CampMode")
                        .font(.largeTitle.bold())
                        .foregroundColor(.white)
                    Text("Discover campsites, EV chargers &\nrest stops across the UK")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                }
                .padding(.bottom, 40)
                
                // Messages
                if let msg = authVM.message {
                    Text(msg)
                        .font(.caption)
                        .foregroundColor(.green)
                        .padding()
                        .background(Color.green.opacity(0.1))
                        .cornerRadius(16)
                        .padding(.bottom, 12)
                }
                if let err = authVM.error {
                    Text(err)
                        .font(.caption)
                        .foregroundColor(.red)
                        .padding()
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(16)
                        .padding(.bottom, 12)
                }
                
                VStack(spacing: 16) {
                    switch mode {
                    case .choose:
                        chooseView
                    case .signIn:
                        signInView
                    case .signUpEmail:
                        signUpEmailView
                    case .signUpPassword:
                        signUpPasswordView
                    }
                }
                .padding(.horizontal, 24)
                
                Spacer()
                
                Text("By continuing, you agree to our Terms of Service and Privacy Policy")
                    .font(.caption2)
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
                    .padding(.bottom, 24)
                    .padding(.horizontal, 40)
            }
        }
    }
    
    // MARK: - Choose mode
    private var chooseView: some View {
        VStack(spacing: 12) {
            SignInWithAppleButton(.continue) { request in
                let hashedNonce = authVM.prepareAppleSignIn()
                request.requestedScopes = [.email, .fullName]
                request.nonce = hashedNonce
            } onCompletion: { result in
                Task { await authVM.handleAppleSignIn(result: result) }
            }
            .signInWithAppleButtonStyle(.white)
            .frame(height: 54)
            .cornerRadius(14)
            
            dividerOr
            
            Button {
                resetForm(); mode = .signIn
            } label: {
                Label("Log in with email", systemImage: "envelope")
                    .frame(maxWidth: .infinity, minHeight: 54)
                    .background(Color(white: 0.15))
                    .foregroundColor(.white)
                    .font(.headline)
                    .cornerRadius(14)
            }
            
            Button {
                resetForm(); mode = .signUpEmail
            } label: {
                Text("Create an account")
                    .frame(maxWidth: .infinity, minHeight: 54)
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(white: 0.3)))
                    .foregroundColor(.gray)
                    .font(.headline)
            }
        }
    }
    
    // MARK: - Sign In
    private var signInView: some View {
        VStack(spacing: 12) {
            backButton { resetForm(); mode = .choose }
            inputField("Email", text: $email, keyboard: .emailAddress, content: .emailAddress)
            inputField("Password", text: $password, isSecure: true, content: .password)
            
            Button { Task { await authVM.signIn(email: email, password: password) } } label: {
                Text("Log in")
                    .frame(maxWidth: .infinity, minHeight: 54)
                    .background(Color.green.opacity(email.isEmpty || password.isEmpty ? 0.3 : 0.8))
                    .foregroundColor(.white)
                    .font(.headline)
                    .cornerRadius(14)
            }
            .disabled(email.isEmpty || password.isEmpty)
            
            Button { Task { await authVM.resetPassword(email: email) } } label: {
                Text("Forgot password?")
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }
        }
    }
    
    // MARK: - Sign Up Email
    private var signUpEmailView: some View {
        VStack(spacing: 12) {
            backButton { resetForm(); mode = .choose }
            inputField("Enter your email", text: $email, keyboard: .emailAddress, content: .emailAddress)
            
            Button { mode = .signUpPassword } label: {
                Text("Continue")
                    .frame(maxWidth: .infinity, minHeight: 54)
                    .background(Color(white: email.isEmpty ? 0.1 : 0.15))
                    .foregroundColor(.white)
                    .font(.headline)
                    .cornerRadius(14)
            }
            .disabled(email.isEmpty)
        }
    }
    
    // MARK: - Sign Up Password
    private var signUpPasswordView: some View {
        VStack(spacing: 12) {
            backButton { mode = .signUpEmail }
            
            Text(email)
                .font(.subheadline)
                .foregroundColor(.gray)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
                .background(Color(white: 0.08))
                .cornerRadius(14)
            
            inputField("Create a password (min 6 chars)", text: $password, isSecure: true, content: .newPassword)
            inputField("Confirm password", text: $confirmPassword, isSecure: true, content: .newPassword)
            
            Button { Task { await authVM.signUp(email: email, password: password) } } label: {
                Label("Create account", systemImage: "lock")
                    .frame(maxWidth: .infinity, minHeight: 54)
                    .background(Color.green.opacity(canSignUp ? 0.8 : 0.3))
                    .foregroundColor(.white)
                    .font(.headline)
                    .cornerRadius(14)
            }
            .disabled(!canSignUp)
        }
    }
    
    private var canSignUp: Bool {
        password.count >= 6 && password == confirmPassword
    }
    
    // MARK: - Helpers
    private var dividerOr: some View {
        HStack {
            Rectangle().fill(Color(white: 0.2)).frame(height: 1)
            Text("or").font(.caption).foregroundColor(.gray)
            Rectangle().fill(Color(white: 0.2)).frame(height: 1)
        }
    }
    
    private func backButton(action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Image(systemName: "chevron.left")
                Text("Back")
            }
            .font(.subheadline)
            .foregroundColor(.gray)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
    
    private func inputField(_ placeholder: String, text: Binding<String>, isSecure: Bool = false, keyboard: UIKeyboardType = .default, content: UITextContentType? = nil) -> some View {
        Group {
            if isSecure {
                SecureField(placeholder, text: text)
                    .textContentType(content)
            } else {
                TextField(placeholder, text: text)
                    .keyboardType(keyboard)
                    .textContentType(content)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
            }
        }
        .padding()
        .background(Color(white: 0.08))
        .cornerRadius(14)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(white: 0.15)))
        .foregroundColor(.white)
    }
    
    private func resetForm() {
        email = ""; password = ""; confirmPassword = ""
        authVM.error = nil; authVM.message = nil
    }
}
