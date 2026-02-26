import SwiftUI

struct SavedPlacesView: View {
    @EnvironmentObject var savedPlaces: SavedPlacesManager
    @Environment(\.dismiss) private var dismiss
    let onSelect: (CampLocation) -> Void
    
    var body: some View {
        NavigationView {
            ZStack {
                Color(red: 0.05, green: 0.05, blue: 0.05).ignoresSafeArea()
                
                if savedPlaces.savedPlaces.isEmpty {
                    emptyState
                } else {
                    list
                }
            }
            .navigationTitle("Saved Places")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button { dismiss() } label: {
                        Image(systemName: "chevron.left").foregroundColor(.gray)
                    }
                }
            }
        }
    }
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "heart")
                .font(.system(size: 40))
                .foregroundColor(.gray)
                .frame(width: 80, height: 80)
                .background(Color(white: 0.15))
                .clipShape(Circle())
            Text("No saved places yet").font(.headline).foregroundColor(.white)
            Text("Tap the heart on a location card to save it here.")
                .font(.subheadline).foregroundColor(.gray)
                .multilineTextAlignment(.center).frame(maxWidth: 260)
            Button { dismiss() } label: {
                Text("Explore map")
                    .font(.subheadline.weight(.medium))
                    .padding(.horizontal, 20).padding(.vertical, 12)
                    .background(Color.green).foregroundColor(.white).cornerRadius(12)
            }
        }
    }
    
    private var list: some View {
        ScrollView {
            LazyVStack(spacing: 8) {
                ForEach(savedPlaces.savedPlaces) { location in
                    HStack(spacing: 12) {
                        Button {
                            onSelect(location)
                        } label: {
                            HStack(spacing: 12) {
                                ZStack {
                                    RoundedRectangle(cornerRadius: 12).fill(location.type.color.opacity(0.15)).frame(width: 48, height: 48)
                                    Image(systemName: location.type.systemImage).foregroundColor(location.type.color)
                                }
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(location.name).font(.subheadline.weight(.medium)).foregroundColor(.white).lineLimit(1)
                                    Text(location.type.singularLabel).font(.caption).foregroundColor(.gray)
                                    HStack(spacing: 4) {
                                        Image(systemName: "mappin").font(.system(size: 9))
                                        Text(location.address).lineLimit(1)
                                    }.font(.caption2).foregroundColor(.gray)
                                }
                                Spacer()
                                Image(systemName: "chevron.right").font(.caption).foregroundColor(Color(white: 0.3))
                            }
                        }
                        
                        Button {
                            savedPlaces.removeSaved(location.id)
                        } label: {
                            Image(systemName: "heart.fill").foregroundColor(.red)
                                .frame(width: 40, height: 40)
                        }
                    }
                    .padding(12)
                    .background(Color(white: 0.07))
                    .cornerRadius(14)
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(white: 0.12)))
                }
            }
            .padding(.horizontal, 16).padding(.bottom, 40)
        }
    }
}
