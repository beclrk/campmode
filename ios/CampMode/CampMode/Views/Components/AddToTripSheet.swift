import SwiftUI

struct AddToTripSheet: View {
    let location: CampLocation
    let userId: String?
    @Environment(\.dismiss) var dismiss
    
    @StateObject private var tripsVM = TripsViewModel()
    @State private var creating = false
    @State private var newName = ""
    @State private var loaded = false
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Location name
                HStack {
                    Text(location.name)
                        .font(.subheadline)
                        .foregroundColor(.gray)
                        .lineLimit(1)
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                
                // Content
                ScrollView {
                    VStack(spacing: 8) {
                        if creating {
                            // Create new trip form
                            VStack(spacing: 12) {
                                TextField("Trip name", text: $newName)
                                    .textFieldStyle(.plain)
                                    .padding(12)
                                    .background(Color(white: 0.15))
                                    .cornerRadius(12)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color(white: 0.2), lineWidth: 1)
                                    )
                                
                                HStack(spacing: 8) {
                                    Button {
                                        Task { await createAndAdd() }
                                    } label: {
                                        Text("Create & add")
                                            .font(.subheadline.weight(.medium))
                                            .foregroundColor(.white)
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 10)
                                            .background(Color.green)
                                            .cornerRadius(12)
                                    }
                                    
                                    Button {
                                        creating = false
                                        newName = ""
                                    } label: {
                                        Text("Cancel")
                                            .font(.subheadline.weight(.medium))
                                            .foregroundColor(.gray)
                                            .padding(.horizontal, 16)
                                            .padding(.vertical, 10)
                                            .background(Color(white: 0.15))
                                            .cornerRadius(12)
                                    }
                                }
                            }
                        } else {
                            // Create new trip button
                            Button {
                                creating = true
                            } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: "plus")
                                        .font(.body)
                                    Text("Create new trip")
                                        .font(.subheadline.weight(.medium))
                                    Spacer()
                                }
                                .foregroundColor(.gray)
                                .padding(14)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .stroke(style: StrokeStyle(lineWidth: 1, dash: [6]))
                                        .foregroundColor(Color(white: 0.3))
                                )
                            }
                            
                            // Existing trips
                            ForEach(tripsVM.trips) { trip in
                                Button {
                                    Task { await addToTrip(trip) }
                                } label: {
                                    HStack(spacing: 12) {
                                        Image(systemName: "arrow.triangle.swap")
                                            .foregroundColor(.green)
                                            .font(.body)
                                        Text(trip.name)
                                            .font(.body.weight(.medium))
                                            .foregroundColor(.white)
                                            .lineLimit(1)
                                        Spacer()
                                        Text("\(trip.locationIds.count) stop\(trip.locationIds.count != 1 ? "s" : "")")
                                            .font(.caption)
                                            .foregroundColor(.gray)
                                    }
                                    .padding(14)
                                    .background(Color(white: 0.12))
                                    .cornerRadius(14)
                                }
                            }
                            
                            if tripsVM.trips.isEmpty && loaded {
                                VStack(spacing: 8) {
                                    Text("No trips yet")
                                        .font(.subheadline)
                                        .foregroundColor(.gray)
                                    Text("Create a new trip to get started")
                                        .font(.caption)
                                        .foregroundColor(Color(white: 0.4))
                                }
                                .padding(.top, 24)
                            }
                        }
                    }
                    .padding(16)
                }
            }
            .background(Color(red: 0.07, green: 0.07, blue: 0.07))
            .navigationTitle("Add to trip")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .foregroundColor(.gray)
                    }
                }
            }
        }
        .presentationDetents([.medium])
        .preferredColorScheme(.dark)
        .task {
            if let uid = userId {
                await tripsVM.loadTrips(userId: uid)
                loaded = true
            }
        }
    }
    
    func addToTrip(_ trip: Trip) async {
        var updated = trip.locationIds
        if !updated.contains(location.id) {
            updated.append(location.id)
        }
        let success = await tripsVM.updateTrip(id: trip.id, name: trip.name, locationIds: updated)
        if success {
            dismiss()
        }
    }
    
    func createAndAdd() async {
        let name = newName.trimmingCharacters(in: .whitespaces).isEmpty ? "New trip" : newName.trimmingCharacters(in: .whitespaces)
        if let trip = await tripsVM.createTrip(name: name) {
            let _ = await tripsVM.updateTrip(id: trip.id, name: trip.name, locationIds: [location.id])
            dismiss()
        }
        newName = ""
        creating = false
    }
}
