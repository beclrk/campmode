import SwiftUI
import CoreLocation

struct LocationListView: View {
    let locations: [CampLocation]
    let userLocation: CLLocation?
    let top10Ids: Set<String>
    let crownIds: Set<String>
    let onSelect: (CampLocation) -> Void
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 8) {
                ForEach(locations) { location in
                    locationRow(location)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 40)
        }
    }
    
    private func locationRow(_ location: CampLocation) -> some View {
        Button { onSelect(location) } label: {
            HStack(spacing: 12) {
                // Icon
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(location.type.color.opacity(0.15))
                        .frame(width: 48, height: 48)
                    Image(systemName: location.type.systemImage)
                        .foregroundColor(location.type.color)
                    
                    if top10Ids.contains(location.id) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 8))
                            .foregroundColor(.white)
                            .frame(width: 14, height: 14)
                            .background(Color.yellow)
                            .clipShape(Circle())
                            .offset(x: -18, y: -18)
                    }
                }
                
                VStack(alignment: .leading, spacing: 3) {
                    Text(location.name)
                        .font(.subheadline.weight(.medium))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    
                    HStack(spacing: 6) {
                        if let rating = location.rating {
                            HStack(spacing: 2) {
                                Image(systemName: "star.fill").font(.system(size: 10)).foregroundColor(.yellow)
                                Text(String(format: "%.1f", rating)).font(.caption).foregroundColor(.white)
                            }
                        }
                        Text(location.type.singularLabel)
                            .font(.caption).foregroundColor(.gray)
                    }
                    
                    if let dist = location.formattedDistance(from: userLocation) {
                        Text(dist).font(.caption).foregroundColor(.gray)
                    }
                }
                
                Spacer()
                
                if !location.priceLabelText.isEmpty {
                    Text(location.priceLabelText)
                        .font(.caption.weight(.medium))
                        .foregroundColor(.green)
                }
                
                Image(systemName: "chevron.right")
                    .font(.caption).foregroundColor(Color(white: 0.3))
            }
            .padding(14)
            .background(Color(white: 0.07))
            .cornerRadius(14)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(white: 0.12)))
        }
    }
}
