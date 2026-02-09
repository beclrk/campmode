import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authVM: AuthViewModel
    
    var body: some View {
        Group {
            if authVM.isLoading {
                ZStack {
                    Color.black.ignoresSafeArea()
                    ProgressView()
                        .tint(.green)
                        .scaleEffect(1.5)
                }
            } else if authVM.isSignedIn {
                HomeView()
            } else {
                LoginView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: authVM.isSignedIn)
    }
}
