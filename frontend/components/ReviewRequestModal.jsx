import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ExternalLink, X, TrendingUp, ShieldCheck } from "lucide-react";

const REVIEW_URL = "https://apps.shopify.com/trustscore-scanner#modal-show=ReviewListingModal";

const ReviewRequestModal = ({ onReview, onDismiss, scoreImprovement = 0, currentScore = 0 }) => {
  // Close on ESC key
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleReviewClick = () => {
    window.open(REVIEW_URL, "_blank", "noopener,noreferrer");
    onReview();
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onDismiss}
      >
        {/* Modal */}
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gradient header band */}
          <div className="gradient-header px-6 pt-8 pb-6 text-center text-primary-foreground relative">
            {/* Dismiss X */}
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3 shadow-lg">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>

            {/* Milestone badge */}
            {scoreImprovement >= 10 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold mb-3">
                <TrendingUp className="w-3.5 h-3.5" />
                Score improved by {scoreImprovement} points!
              </div>
            )}

            <h2 className="text-xl font-bold mb-1">
              {scoreImprovement >= 10 ? "🎉 Nice work!" : "Enjoying TrustScore?"}
            </h2>
            <p className="text-sm text-primary-foreground/80">
              {scoreImprovement >= 10
                ? `You've raised your trust score to ${currentScore}/100`
                : `Your store is now at ${currentScore}/100 trust score`}
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            {/* Stars */}
            <div className="flex items-center justify-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.div
                  key={star}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + star * 0.07, duration: 0.3, ease: "backOut" }}
                >
                  <Star className="w-7 h-7 fill-warning text-warning" />
                </motion.div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground text-center mb-5 leading-relaxed">
              Help other Shopify merchants discover TrustScore. A quick review only takes 30 seconds and makes a real difference.
            </p>

            {/* Social proof */}
            <div className="flex items-center justify-center gap-4 mb-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-foreground">30 sec</span>
                <span>to write</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-border" />
              <div className="flex items-center gap-1">
                <span className="font-semibold text-foreground">Helps</span>
                <span>other merchants</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-border" />
              <div className="flex items-center gap-1">
                <span className="font-semibold text-foreground">Free</span>
                <span>to leave</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-2.5">
              <button
                onClick={handleReviewClick}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm"
              >
                <Star className="w-4 h-4 fill-current" />
                Leave a Review
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </button>

              <button
                onClick={onDismiss}
                className="w-full px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReviewRequestModal;
