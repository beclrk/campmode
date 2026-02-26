import SwiftUI

struct FilterPillsView: View {
    @Binding var selectedTypes: Set<LocationType>
    let counts: [LocationType: Int]
    let onToggle: (LocationType) -> Void
    
    private let filters: [(LocationType, String)] = [
        (.campsite, "Campsites"),
        (.restStop, "Rest Stops"),
        (.evCharger, "EV Chargers"),
    ]
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(filters, id: \.0) { type, label in
                    let isSelected = selectedTypes.contains(type)
                    let count = counts[type] ?? 0
                    
                    Button { onToggle(type) } label: {
                        HStack(spacing: 6) {
                            Image(systemName: type.systemImage)
                                .font(.system(size: 14))
                            Text(label)
                                .font(.subheadline.weight(.medium))
                            Text("\(count)")
                                .font(.caption2)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(isSelected ? Color.white.opacity(0.15) : Color(white: 0.2))
                                .cornerRadius(8)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(
                            isSelected
                            ? type.color.opacity(0.55)
                            : Color(white: 0.15).opacity(0.8)
                        )
                        .foregroundColor(isSelected ? .white : Color(white: 0.75))
                        .cornerRadius(20)
                        .overlay(
                            isSelected
                            ? RoundedRectangle(cornerRadius: 20).stroke(type.color.opacity(0.25))
                            : nil
                        )
                    }
                }
            }
        }
    }
}
