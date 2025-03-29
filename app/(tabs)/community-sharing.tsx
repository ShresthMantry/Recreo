import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
  RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../../context/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from 'expo-file-system';
import * as Haptics from "expo-haptics";
import { decode } from 'base64-arraybuffer';

// Initialize Supabase client
const supabase = createClient(
  "https://ysavghvmswenmddlnshr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzYXZnaHZtc3dlbm1kZGxuc2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5OTY4MzIsImV4cCI6MjA1ODU3MjgzMn0.GCQ0xl7wJKI_YB8d3PP1jBDcs-aRJLRLjk9-NdB1_bs",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    }
  }
);

interface Post {
  id: string;
  user_email: string;
  username: string;
  content: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

interface Comment {
  id: string;
  post_id: string;
  user_email: string;
  username: string;
  content: string;
  created_at: string;
}

export default function CommunitySharing() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [newCommentContent, setNewCommentContent] = useState("");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<"feed" | "comments">("feed");

  const generateTempId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleError = (error: any) => {
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    Alert.alert("Error", error.message || "An unexpected error occurred");
  };

  const getImageUrl = (path: string) => {
    return `https://ysavghvmswenmddlnshr.supabase.co/storage/v1/object/public/community-images/${path}`;
  };

  const uploadImage = async (uri: string) => {
    try {
      console.log("Starting image upload, URI:", uri);
      
      // Read the file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user?.email}/${Date.now()}.${fileExt}`;
      
      console.log("Uploading to Supabase with path:", fileName);
      
      const { data, error } = await supabase.storage
        .from("community-images")
        .upload(fileName, decode(base64), {
          contentType: `image/${fileExt}`,
          upsert: false,
          cacheControl: '3600',
        });

      if (error) {
        console.error("Supabase upload error:", error);
        throw error;
      }
      
      console.log("Upload successful:", data);
      return fileName;
    } catch (error) {
      console.error("Upload image error:", error);
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Fetch all posts
  useEffect(() => {
    if (user?.email) {
      fetchPosts();
    }
  }, [user?.email]);

  // Fetch comments for selected post
  useEffect(() => {
    if (selectedPostId) {
      fetchComments(selectedPostId);
    }
  }, [selectedPostId]);

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Enhance posts with full image URLs
      const postsWithImages = data?.map(post => ({
        ...post,
        image_url: post.image_url ? getImageUrl(post.image_url) : null
      })) || [];
      
      setPosts(postsWithImages);
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from("community_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      handleError(error);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPosts();
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
      if (!permissionResult.granted) {
        Alert.alert("Permission Denied", "You need to allow access to your media library to pick an image.");
        return;
      }
  
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
  
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      handleError(error);
    }
  };

  const createPost = async () => {
    if (!user?.email || !newPostContent.trim()) return;

    const tempId = generateTempId();
    const username = user.name || user.email.split("@")[0] || "Anonymous";
    
    // Create optimistic post (without image URL first)
    const optimisticPost: Post = {
      id: tempId,
      user_email: user.email,
      username,
      content: newPostContent,
      image_url: null, // Will be updated after upload
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setPosts(prev => [optimisticPost, ...prev]);
    setNewPostContent("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    let imageUrl: string | null = null;
    if (image) {
      try {
        setUploading(true);
        imageUrl = await uploadImage(image);
        console.log("Image uploaded successfully:", imageUrl);
        
        // Update the optimistic post with the image URL
        setPosts(prev => prev.map(post => 
          post.id === tempId ? { ...post, image_url: imageUrl ? getImageUrl(imageUrl) : null } : post
        ));
      } catch (uploadError) {
        console.error("Image upload failed:", uploadError);
        Alert.alert(
          "Image Upload Failed",
          "Your post was created without the image.",
          [{ text: "OK" }]
        );
      } finally {
        setUploading(false);
        setImage(null);
      }
    }

    // Create the actual post in database
    try {
      const { data, error } = await supabase
        .from("community_posts")
        .insert([{
          user_email: user.email,
          username,
          content: newPostContent,
          image_url: imageUrl, // This is the storage path, not full URL
        }])
        .select();

      if (error) throw error;

      console.log("Post created successfully:", data[0]);
      
      // Replace optimistic post with actual post from database
      setPosts(prev => prev.map(post => 
        post.id === tempId ? { 
          ...data[0], 
          image_url: data[0].image_url ? getImageUrl(data[0].image_url) : null 
        } : post
      ));
    } catch (error) {
      handleError(error);
      // Remove the optimistic post if creation failed
      setPosts(prev => prev.filter(post => post.id !== tempId));
    }
  };

  const addComment = async () => {
    try {
      if (!user?.email || !selectedPostId || !newCommentContent.trim()) return;

      const tempId = generateTempId();
      const username = user.name || user.email.split("@")[0] || "Anonymous";
      
      const optimisticComment: Comment = {
        id: tempId,
        post_id: selectedPostId,
        user_email: user.email,
        username,
        content: newCommentContent,
        created_at: new Date().toISOString(),
      };

      setComments(prev => [...prev, optimisticComment]);
      setNewCommentContent("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const { data, error } = await supabase
        .from("community_comments")
        .insert([{
          post_id: selectedPostId,
          user_email: user.email,
          username,
          content: newCommentContent,
        }])
        .select();

      if (error) throw error;

      setComments(prev => prev.map(comment => comment.id === tempId ? data[0] : comment));
    } catch (error) {
      handleError(error);
      setComments(prev => prev.filter(comment => comment.id.startsWith('temp-')));
    }
  };

  const deletePost = async (postId: string) => {
    try {
      Alert.alert(
        "Delete Post",
        "Are you sure you want to delete this post?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              // Find the post to get the image_url before deleting
              const postToDelete = posts.find(post => post.id === postId);
              
              // Optimistic update
              setPosts(prev => prev.filter(post => post.id !== postId));
              if (selectedPostId === postId) {
                setSelectedPostId(null);
                setViewMode("feed");
              }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              // Delete from database
              const { error } = await supabase
                .from("community_posts")
                .delete()
                .eq("id", postId);

              if (error) throw error;
              
              // Delete the image from storage if it exists
              if (postToDelete?.image_url) {
                try {
                  const imagePath = postToDelete.image_url.replace('https://ysavghvmswenmddlnshr.supabase.co/storage/v1/object/public/community-images/', '');
                  await supabase.storage
                    .from("community-images")
                    .remove([imagePath]);
                } catch (imageDeleteError) {
                  console.error("Failed to delete image:", imageDeleteError);
                  // Continue anyway as the post is already deleted
                }
              }
            },
          },
        ]
      );
    } catch (error) {
      handleError(error);
      fetchPosts();
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const { error } = await supabase
        .from("community_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
    } catch (error) {
      handleError(error);
      if (selectedPostId) fetchComments(selectedPostId);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, h:mm a");
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Community</Text>
        <Text style={styles.subtitle}>Please log in to access the community</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Community</Text>
        {viewMode === "comments" && (
          <TouchableOpacity
            onPress={() => {
              setViewMode("feed");
              setSelectedPostId(null);
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#8B5CF6" />
          </TouchableOpacity>
        )}
      </View>

      {viewMode === "feed" ? (
        <>
          <View style={styles.createPostContainer}>
            <TextInput
              style={styles.postInput}
              placeholder="What's on your mind?"
              placeholderTextColor="#6b7280"
              multiline
              value={newPostContent}
              onChangeText={setNewPostContent}
            />
            {image && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: image }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImage(null)}
                >
                  <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.postActions}>
              <TouchableOpacity onPress={pickImage} style={styles.actionButton}>
                <Ionicons name="image-outline" size={24} color="#8B5CF6" />
                <Text style={styles.actionButtonText}>Add Image</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={createPost}
                style={[
                  styles.postButton,
                  (!newPostContent.trim() || uploading) && styles.disabledButton,
                ]}
                disabled={uploading || !newPostContent.trim()}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.postButtonText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
          ) : (
            <FlatList
              data={posts}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor="#8B5CF6"
                />
              }
              renderItem={({ item }) => (
                <View style={styles.postContainer}>
                  <View style={styles.postHeader}>
                    <Text style={styles.postUsername}>{item.username}</Text>
                    <Text style={styles.postDate}>{formatDate(item.created_at)}</Text>
                    {item.user_email === user.email && (
                      <TouchableOpacity
                        onPress={() => deletePost(item.id)}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {item.image_url && (
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.postImage}
                      resizeMode="cover"
                    />
                  )}
                  <Text style={styles.postContent}>{item.content}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedPostId(item.id);
                      setViewMode("comments");
                    }}
                    style={styles.commentButton}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color="#8B5CF6" />
                    <Text style={styles.commentButtonText}>Comments</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyState}>No posts yet. Be the first to share!</Text>
              }
              contentContainerStyle={styles.postsList}
            />
          )}
        </>
      ) : (
        <>
          {selectedPostId && posts.find((p) => p.id === selectedPostId) && (
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>
                Comments on {posts.find((p) => p.id === selectedPostId)?.username}'s post
              </Text>
            </View>
          )}
          
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.commentContainer}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentUsername}>{item.username}</Text>
                  <Text style={styles.commentDate}>{formatDate(item.created_at)}</Text>
                  {item.user_email === user.email && (
                    <TouchableOpacity
                      onPress={() => deleteComment(item.id)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.commentContent}>{item.content}</Text>
              </View>
            )}
            contentContainerStyle={styles.commentsList}
            ListEmptyComponent={
              <Text style={styles.emptyState}>No comments yet. Be the first to comment!</Text>
            }
          />

          <View style={styles.addCommentContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
              placeholderTextColor="#6b7280"
              value={newCommentContent}
              onChangeText={setNewCommentContent}
            />
            <TouchableOpacity
              onPress={addComment}
              style={[
                styles.commentPostButton,
                !newCommentContent.trim() && styles.disabledButton,
              ]}
              disabled={!newCommentContent.trim()}
            >
              <Text style={styles.commentPostButtonText}>Post</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2d2d2d",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 16,
    color: "#9ca3af",
    marginTop: 8,
  },
  backButton: {
    padding: 8,
  },
  createPostContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2d2d2d",
  },
  postInput: {
    backgroundColor: "#1e1e1e",
    color: "#ffffff",
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    marginBottom: 12,
    fontSize: 16,
  },
  imagePreviewContainer: {
    position: "relative",
    marginBottom: 12,
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  actionButtonText: {
    color: "#8B5CF6",
    marginLeft: 4,
    fontWeight: "500",
  },
  postButton: {
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: "#4B3385",
    opacity: 0.7,
  },
  postButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  postsList: {
    paddingBottom: 16,
  },
  postContainer: {
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  postUsername: {
    color: "#8B5CF6",
    fontWeight: "600",
    fontSize: 16,
  },
  postDate: {
    color: "#6b7280",
    fontSize: 12,
  },
  deleteButton: {
    padding: 4,
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  postContent: {
    color: "#ffffff",
    fontSize: 16,
    marginBottom: 12,
  },
  commentButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  commentButtonText: {
    color: "#8B5CF6",
    marginLeft: 4,
    fontWeight: "500",
  },
  emptyState: {
    color: "#6b7280",
    textAlign: "center",
    marginTop: 32,
    paddingHorizontal: 16,
  },
  commentsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2d2d2d",
  },
  commentsTitle: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 18,
  },
  commentsList: {
    paddingBottom: 80,
  },
  commentContainer: {
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  commentUsername: {
    color: "#8B5CF6",
    fontWeight: "500",
    fontSize: 14,
  },
  commentDate: {
    color: "#6b7280",
    fontSize: 12,
  },
  commentContent: {
    color: "#ffffff",
    fontSize: 14,
  },
  addCommentContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#121212",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#2d2d2d",
    flexDirection: "row",
    alignItems: "center",
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#1e1e1e",
    color: "#ffffff",
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
  },
  commentPostButton: {
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  commentPostButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});