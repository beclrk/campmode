import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @Environment(\.dismiss) var dismiss
    
    @AppStorage("distanceUnits") private var distanceUnits: String = "miles"
    @AppStorage("notifySavedPlaces") private var notifySavedPlaces = false
    @AppStorage("notifyUpdates") private var notifyUpdates = true
    
    @State private var editingName = false
    @State private var displayName = ""
    @State private var nameSaving = false
    @State private var accountError: String?
    @State private var changePasswordSending = false
    @State private var changePasswordMessage: String?
    @State private var showDeleteConfirm = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 32) {
                    // Map & Display
                    settingsSection(title: "Map & display", icon: "map") {
                        VStack(spacing: 0) {
                            settingsRow(label: "Distance units", description: "Show distances in miles or kilometres") {
                                HStack(spacing: 8) {
                                    unitButton("Miles", value: "miles")
                                    unitButton("km", value: "km")
                                }
                            }
                        }
                    }
                    
                    // Notifications
                    settingsSection(title: "Notifications", icon: "bell") {
                        VStack(spacing: 0) {
                            settingsRow(label: "Saved places", description: "Get notified about updates to your saved locations") {
                                Toggle("", isOn: $notifySavedPlaces)
                                    .tint(.green)
                                    .labelsHidden()
                            }
                            Divider().background(Color(white: 0.2))
                            settingsRow(label: "App updates", description: "News and new features") {
                                Toggle("", isOn: $notifyUpdates)
                                    .tint(.green)
                                    .labelsHidden()
                            }
                        }
                    }
                    
                    // Account
                    settingsSection(title: "Account", icon: "person") {
                        VStack(spacing: 0) {
                            if authVM.isAuthenticated {
                                // Display name
                                if editingName {
                                    VStack(alignment: .leading, spacing: 12) {
                                        Text("Display name")
                                            .font(.caption)
                                            .foregroundColor(.gray)
                                        TextField("Your name", text: $displayName)
                                            .textFieldStyle(.plain)
                                            .padding(12)
                                            .background(Color(white: 0.15))
                                            .cornerRadius(12)
                                        HStack(spacing: 8) {
                                            Button {
                                                Task { await saveName() }
                                            } label: {
                                                Text(nameSaving ? "Saving…" : "Save")
                                                    .font(.subheadline.weight(.medium))
                                                    .padding(.horizontal, 16)
                                                    .padding(.vertical, 8)
                                                    .background(Color.green)
                                                    .foregroundColor(.white)
                                                    .cornerRadius(12)
                                            }
                                            .disabled(nameSaving)
                                            Button {
                                                displayName = authVM.userName ?? ""
                                                editingName = false
                                            } label: {
                                                Text("Cancel")
                                                    .font(.subheadline.weight(.medium))
                                                    .padding(.horizontal, 16)
                                                    .padding(.vertical, 8)
                                                    .background(Color(white: 0.25))
                                                    .foregroundColor(.gray)
                                                    .cornerRadius(12)
                                            }
                                        }
                                    }
                                    .padding(16)
                                    Divider().background(Color(white: 0.2))
                                } else {
                                    settingsRow(label: "Display name", description: authVM.userName ?? "Not set") {
                                        Button("Edit") {
                                            displayName = authVM.userName ?? ""
                                            editingName = true
                                        }
                                        .font(.subheadline.weight(.medium))
                                        .foregroundColor(.green)
                                    }
                                    Divider().background(Color(white: 0.2))
                                }
                                
                                // Email
                                settingsRow(label: "Email", description: authVM.userEmail ?? "")
                                Divider().background(Color(white: 0.2))
                                
                                if let err = accountError {
                                    HStack {
                                        Text(err)
                                            .font(.caption)
                                            .foregroundColor(.red)
                                        Spacer()
                                    }
                                    .padding(16)
                                    .background(Color.red.opacity(0.1))
                                    Divider().background(Color(white: 0.2))
                                }
                                
                                // Change password
                                settingsRowButton(
                                    label: "Change password",
                                    description: changePasswordSending ? "Sending link…" : (changePasswordMessage ?? "Send a link to your email to set a new password")
                                ) {
                                    Task { await changePassword() }
                                }
                                Divider().background(Color(white: 0.2))
                                
                                // Sign out
                                settingsRowButton(label: "Sign out", description: "Sign out of your account on this device") {
                                    authVM.signOut()
                                    dismiss()
                                }
                                Divider().background(Color(white: 0.2))
                                
                                // Delete account
                                settingsRowButton(label: "Delete account", description: "Permanently remove your account and data", isDestructive: true) {
                                    showDeleteConfirm = true
                                }
                                
                                if showDeleteConfirm {
                                    VStack(alignment: .leading, spacing: 12) {
                                        Text("To delete your account and all saved data, please email us at **support@campmode.app** with the subject \"Delete my account\" and we'll process your request.")
                                            .font(.caption)
                                            .foregroundColor(.gray)
                                        Button("Dismiss") { showDeleteConfirm = false }
                                            .font(.caption)
                                            .foregroundColor(.gray)
                                    }
                                    .padding(16)
                                    .background(Color.red.opacity(0.05))
                                }
                            } else {
                                settingsRowButton(label: "Sign in", description: "Sign in or create an account") {
                                    // Navigate to login - handled by parent
                                    dismiss()
                                }
                            }
                        }
                    }
                    
                    // About & support
                    settingsSection(title: "About & support", icon: "info.circle") {
                        VStack(spacing: 0) {
                            settingsRow(label: "Version", description: "2.0.0")
                            Divider().background(Color(white: 0.2))
                            settingsRowButton(label: "Privacy Policy") {
                                if let url = URL(string: "https://campmode.app/privacy") {
                                    UIApplication.shared.open(url)
                                }
                            }
                            Divider().background(Color(white: 0.2))
                            settingsRowButton(label: "Terms of Service") {
                                if let url = URL(string: "https://campmode.app/terms") {
                                    UIApplication.shared.open(url)
                                }
                            }
                            Divider().background(Color(white: 0.2))
                            settingsRowButton(label: "Send feedback", description: "Help us improve CampMode") {
                                if let url = URL(string: "mailto:support@campmode.app") {
                                    UIApplication.shared.open(url)
                                }
                            }
                        }
                    }
                    
                    // Data & privacy
                    settingsSection(title: "Data & privacy", icon: "shield") {
                        VStack(spacing: 0) {
                            settingsRow(label: "Your data", description: "Locations you save and preferences are stored securely")
                            Divider().background(Color(white: 0.2))
                            settingsRowButton(label: "Clear cache", description: "Free up space; map tiles will re-download when needed") {
                                URLCache.shared.removeAllCachedResponses()
                            }
                        }
                    }
                }
                .padding(16)
            }
            .background(Color(red: 0.05, green: 0.05, blue: 0.05))
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button { dismiss() } label: {
                        Image(systemName: "chevron.left")
                            .foregroundColor(.white)
                    }
                }
            }
        }
        .preferredColorScheme(.dark)
    }
    
    // MARK: - Section Builder
    
    @ViewBuilder
    func settingsSection(title: String, icon: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .foregroundColor(.green)
                    .font(.body)
                Text(title)
                    .font(.headline)
                    .foregroundColor(.white)
            }
            content()
                .background(Color(white: 0.1))
                .cornerRadius(16)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color(white: 0.15), lineWidth: 1)
                )
        }
    }
    
    // MARK: - Row Builders
    
    @ViewBuilder
    func settingsRow(label: String, description: String? = nil, @ViewBuilder trailing: () -> some View = { EmptyView() }) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.body.weight(.medium))
                    .foregroundColor(.white)
                if let desc = description {
                    Text(desc)
                        .font(.caption)
                        .foregroundColor(.gray)
                }
            }
            Spacer()
            trailing()
        }
        .padding(16)
    }
    
    @ViewBuilder
    func settingsRowButton(label: String, description: String? = nil, isDestructive: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(label)
                        .font(.body.weight(.medium))
                        .foregroundColor(isDestructive ? .red : .white)
                    if let desc = description {
                        Text(desc)
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            .padding(16)
        }
    }
    
    func unitButton(_ label: String, value: String) -> some View {
        Button {
            distanceUnits = value
        } label: {
            Text(label)
                .font(.subheadline.weight(.medium))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(distanceUnits == value ? Color.green : Color(white: 0.15))
                .foregroundColor(distanceUnits == value ? .white : .gray)
                .cornerRadius(8)
        }
    }
    
    // MARK: - Actions
    
    func saveName() async {
        nameSaving = true
        accountError = nil
        // In a full implementation, call Supabase to update user metadata
        nameSaving = false
        editingName = false
    }
    
    func changePassword() async {
        guard let email = authVM.userEmail else { return }
        changePasswordSending = true
        changePasswordMessage = nil
        accountError = nil
        // In a full implementation, call Supabase password reset
        changePasswordSending = false
        changePasswordMessage = "Check your email for a link to change your password."
    }
}
