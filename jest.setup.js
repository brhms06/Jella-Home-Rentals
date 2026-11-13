// Shared test mocks: in-memory AsyncStorage and a stub Supabase client (no network, no env vars needed).
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("@/lib/supabase", () => ({ supabase: { rpc: jest.fn(), from: jest.fn(), functions: { invoke: jest.fn() } } }));
