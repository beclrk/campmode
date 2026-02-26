import SwiftUI

struct TripsView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @StateObject private var tripsVM = TripsViewModel()
    @ObservedObject var mapVM: MapViewModel
    let onDismiss: () -> Void
    
    @State private var isCreating = false
    @State private var newName = ""
    @State private var expandedId: String?
    @State private var tripLocations: [String: [CampLocation]] = [:]
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ZStack {
                Color(red: 0.05, green: 0.05, blue: 0.05).ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 12) {
                        createSection
                        
                        if tripsVM.isLoading {
                            Text("Loading trips…").foregroundColor(.gray).font(.caption).padding()
                        } else if tripsVM.trips.isEmpty {
                            emptyState
                        } else {
                            ForEach(tripsVM.trips) { trip in
                                tripRow(trip)
                            }
                        }
                    }
                    .padding(.horizontal, 16).padding(.bottom, 40)
                }
            }
            .navigationTitle("My Trips")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button { dismiss(); onDismiss() } label: {
                        Image(systemName: "chevron.left").foregroundColor(.gray)
                    }
                }
            }
        }
        .task {
            tripsVM.setUser(authVM.user?.id)
        }
    }
    
    private var createSection: some View {
        Group {
            if isCreating {
                VStack(spacing: 10) {
                    TextField("Trip name", text: $newName)
                        .padding(12).background(Color(white: 0.1)).cornerRadius(10)
                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(white: 0.2)))
                        .foregroundColor(.white)
                    HStack(spacing: 8) {
                        Button {
                            Task {
                                _ = await tripsVM.createTrip(name: newName)
                                newName = ""; isCreating = false
                            }
                        } label: {
                            Text("Create").frame(maxWidth: .infinity, minHeight: 40)
                                .background(Color.green).foregroundColor(.white).cornerRadius(12)
                        }
                        Button { isCreating = false; newName = "" } label: {
                            Text("Cancel").frame(maxWidth: .infinity, minHeight: 40)
                                .background(Color(white: 0.15)).foregroundColor(.gray).cornerRadius(12)
                        }
                    }
                }
                .padding(14).background(Color(white: 0.07)).cornerRadius(14)
            } else {
                Button { isCreating = true } label: {
                    HStack {
                        Image(systemName: "plus")
                        Text("New trip")
                    }
                    .frame(maxWidth: .infinity, minHeight: 48)
                    .foregroundColor(.gray)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(white: 0.25), style: StrokeStyle(lineWidth: 1, dash: [6])))
                }
            }
        }
    }
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "point.topleft.down.to.point.bottomright.curvepath")
                .font(.system(size: 40)).foregroundColor(.gray)
                .frame(width: 80, height: 80).background(Color(white: 0.15)).clipShape(Circle())
            Text("No trips yet").font(.headline).foregroundColor(.white)
            Text("Create a trip and add places from the map.").font(.subheadline).foregroundColor(.gray).multilineTextAlignment(.center)
        }
        .padding(.top, 60)
    }
    
    private func tripRow(_ trip: Trip) -> some View {
        VStack(spacing: 0) {
            Button {
                withAnimation {
                    if expandedId == trip.id {
                        expandedId = nil
                    } else {
                        expandedId = trip.id
                        if tripLocations[trip.id] == nil && !trip.locationIds.isEmpty {
                            Task { tripLocations[trip.id] = await tripsVM.loadTripLocations(trip) }
                        }
                    }
                }
            } label: {
                HStack(spacing: 12) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 12).fill(Color.green.opacity(0.15)).frame(width: 48, height: 48)
                        Image(systemName: "point.topleft.down.to.point.bottomright.curvepath").foregroundColor(.green)
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(trip.name).font(.subheadline.weight(.medium)).foregroundColor(.white)
                        Text("\(trip.locationIds.count) stop\(trip.locationIds.count == 1 ? "" : "s")").font(.caption).foregroundColor(.gray)
                    }
                    Spacer()
                    
                    ShareLink(item: "https://campmode.app/trip/\(trip.id)") {
                        Image(systemName: "square.and.arrow.up").foregroundColor(.gray)
                    }
                    
                    Button {
                        Task { await tripsVM.deleteTrip(trip.id) }
                    } label: {
                        Image(systemName: "trash").foregroundColor(.red)
                    }
                }
                .padding(14)
            }
            
            if expandedId == trip.id {
                VStack(spacing: 8) {
                    if !trip.locationIds.isEmpty {
                        Button {
                            Task {
                                let locs = await tripsVM.loadTripLocations(trip)
                                mapVM.routeStops = locs
                                mapVM.showRoutePlanner = true
                                dismiss(); onDismiss()
                            }
                        } label: {
                            HStack {
                                Image(systemName: "map")
                                Text("Open on map")
                            }
                            .frame(maxWidth: .infinity, minHeight: 40)
                            .background(Color.green).foregroundColor(.white).font(.subheadline.weight(.medium)).cornerRadius(10)
                        }
                    }
                    
                    ForEach(tripLocations[trip.id] ?? [], id: \.id) { loc in
                        HStack(spacing: 8) {
                            Image(systemName: loc.type.systemImage).font(.caption).foregroundColor(loc.type.color)
                            Text(loc.name).font(.caption).foregroundColor(.white).lineLimit(1)
                            Spacer()
                            Text(loc.type.singularLabel).font(.caption2).foregroundColor(.gray)
                        }
                        .padding(8).background(Color(white: 0.08)).cornerRadius(8)
                    }
                }
                .padding(.horizontal, 14).padding(.bottom, 14)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .background(Color(white: 0.07))
        .cornerRadius(14)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(white: 0.12)))
    }
}
