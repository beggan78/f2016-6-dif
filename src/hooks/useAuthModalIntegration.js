import { useAuthModal } from '../components/auth/AuthModal';

/**
 * useAuthModalIntegration - Standardized hook for authModal prop integration
 * 
 * Handles the common pattern of accepting an authModal prop or falling back
 * to a local useAuthModal instance. Ensures React Hooks rules compliance
 * by always calling useAuthModal unconditionally.
 * 
 * @param {Object} authModalProp - Optional authModal instance passed as prop
 * @returns {Object} - The authModal instance to use (prop or fallback)
 * 
 * @example
 * function MyComponent({ authModal: authModalProp }) {
 *   const authModal = useAuthModalIntegration(authModalProp);
 *   
 *   const handleSignIn = () => {
 *     authModal.openLogin();
 *   };
 * }
 */
export function useAuthModalIntegration(authModalProp) {
  // Always call the hook to satisfy React Hooks rules
  const fallbackAuthModal = useAuthModal();
  
  // Use prop if provided, otherwise use fallback
  return authModalProp || fallbackAuthModal;
}