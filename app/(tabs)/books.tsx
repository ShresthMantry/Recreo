import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator
} from "react-native";
import axios from "axios";

const GOOGLE_BOOKS_API_KEY = "AIzaSyAORif4JskaLIcWPwVHIEcZ2u-Y3vm6LWs";

// Type definitions
interface BookVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    publisher?: string;
    publishedDate?: string;
    averageRating?: number;
    ratingsCount?: number;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
  saleInfo?: {
    listPrice?: {
      amount: number;
      currencyCode: string;
    };
  };
}

interface BookDetailsProps {
  book: BookVolume;
  onClose: () => void;
}

export default function Books() {
  const [books, setBooks] = useState<BookVolume[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [query, setQuery] = useState<string>("fiction");
  const [selectedCategory, setSelectedCategory] = useState<string>("fiction");
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedBook, setSelectedBook] = useState<BookVolume | null>(null);

  const categories: string[] = [
    "fiction", 
    "mystery", 
    "science fiction", 
    "fantasy", 
    "romance", 
    "biography"
  ];

  const fetchBooks = async (searchTerm: string): Promise<void> => {
    setLoading(true);
    try {
      const response = await axios.get<{items?: BookVolume[]}>(
        `https://www.googleapis.com/books/v1/volumes?q=${searchTerm}&maxResults=15&key=${GOOGLE_BOOKS_API_KEY}`
      );
      setBooks(response.data.items || []);
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks(query);
  }, []);

  const handleCategoryPress = (category: string): void => {
    setSelectedCategory(category);
    setQuery(category);
    fetchBooks(category);
  };

  const handleSearch = (): void => {
    fetchBooks(query);
  };

  const handleBookPress = (book: BookVolume): void => {
    setSelectedBook(book);
    setModalVisible(true);
  };

  const BookDetails: React.FC<BookDetailsProps> = ({ book, onClose }) => (
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        
        <Image 
          source={{ 
            uri: book.volumeInfo.imageLinks?.thumbnail || 'https://via.placeholder.com/128x192?text=No+Cover' 
          }}
          style={styles.modalCover}
        />
        
        <Text style={styles.modalTitle}>{book.volumeInfo.title}</Text>
        
        {book.volumeInfo.authors && (
          <Text style={styles.modalAuthor}>
            by {book.volumeInfo.authors.join(", ")}
          </Text>
        )}
        
        {book.volumeInfo.publisher && (
          <Text style={styles.publisher}>
            Publisher: {book.volumeInfo.publisher}
          </Text>
        )}
        
        {book.volumeInfo.publishedDate && (
          <Text style={styles.publishDate}>
            Published: {book.volumeInfo.publishedDate}
          </Text>
        )}
        
        <View style={styles.ratingContainer}>
          {book.volumeInfo.averageRating && (
            <Text style={styles.rating}>
              ★ {book.volumeInfo.averageRating.toFixed(1)}
              {book.volumeInfo.ratingsCount && ` (${book.volumeInfo.ratingsCount})`}
            </Text>
          )}
        </View>
        
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>Description:</Text>
          <Text style={styles.description}>
            {book.volumeInfo.description || "No description available."}
          </Text>
        </View>
        
        {book.saleInfo?.listPrice && (
          <Text style={styles.price}>
            Price: {book.saleInfo.listPrice.amount} {book.saleInfo.listPrice.currencyCode}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Discover Books</Text>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search books..."
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === item && styles.selectedCategory,
              ]}
              onPress={() => handleCategoryPress(item)}
            >
              <Text 
                style={[
                  styles.categoryText,
                  selectedCategory === item && styles.selectedCategoryText,
                ]}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Loading books...</Text>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.booksList}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.bookItem}
              onPress={() => handleBookPress(item)}
            >
              <Image
                source={{ 
                  uri: item.volumeInfo.imageLinks?.thumbnail || 'https://via.placeholder.com/128x192?text=No+Cover' 
                }}
                style={styles.bookCover}
              />
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={2}>
                  {item.volumeInfo.title}
                </Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>
                  {item.volumeInfo.authors?.join(", ") || "Unknown Author"}
                </Text>
                {item.volumeInfo.averageRating && (
                  <Text style={styles.bookRating}>
                    ★ {item.volumeInfo.averageRating.toFixed(1)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No books found for "{query}"</Text>
          }
        />
      )}
      
      {modalVisible && selectedBook && (
        <BookDetails 
          book={selectedBook} 
          onClose={() => setModalVisible(false)} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16,
    backgroundColor: "#f5f5f5"
  },
  title: { 
    fontSize: 28, 
    marginBottom: 16, 
    textAlign: "center",
    fontWeight: "bold",
    color: "#1a1a2e"
  },
  searchContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  searchButton: {
    marginLeft: 8,
    backgroundColor: "#6200ee",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  searchButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#e0e0e0",
  },
  selectedCategory: {
    backgroundColor: "#6200ee",
  },
  categoryText: {
    color: "#555",
  },
  selectedCategoryText: {
    color: "#fff",
    fontWeight: "bold",
  },
  booksList: {
    paddingBottom: 20,
  },
  bookItem: {
    flex: 1,
    margin: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxWidth: "47%",
  },
  bookCover: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  bookInfo: {
    padding: 12,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#1a1a2e",
  },
  bookAuthor: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  bookRating: {
    fontSize: 14,
    color: "#ff9800",
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
    color: "#666",
  },
  modalContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    overflow: "scroll",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1000,
  },
  closeButtonText: {
    fontSize: 24,
    color: "#333",
  },
  modalCover: {
    width: 150,
    height: 225,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#1a1a2e",
  },
  modalAuthor: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
  },
  publisher: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  publishDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  ratingContainer: {
    marginBottom: 16,
  },
  rating: {
    fontSize: 16,
    color: "#ff9800",
    fontWeight: "bold",
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  description: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4caf50",
  },
});