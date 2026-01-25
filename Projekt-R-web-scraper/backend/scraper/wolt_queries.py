#dummy wolt queri
MENU_QUERY = """
query Menu($slug: String!, $lat: Float!, $lng: Float!) {
  restaurant(slug: $slug, lat: $lat, lng: $lng) {
    name
    sections {
      name
      items {
        name
        price
      }
    }
  }
}
"""
