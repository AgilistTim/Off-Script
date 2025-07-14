import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface QuickAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'voice';
  icon?: string;
  disabled?: boolean;
}

export interface QuickActionsProps {
  actions: QuickAction[];
  onActionClick: (actionId: string) => void;
  className?: string;
  maxVisible?: number;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  actions,
  onActionClick,
  className = '',
  maxVisible = 4
}) => {
  const getActionStyles = (type: QuickAction['type']) => {
    switch (type) {
      case 'primary':
        return 'bg-blue-500 text-white hover:bg-blue-600 shadow-md';
      case 'voice':
        return 'bg-purple-500 text-white hover:bg-purple-600 shadow-md';
      case 'secondary':
      default:
        return 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm';
    }
  };

  const visibleActions = actions.slice(0, maxVisible);

  return (
    <motion.div
      className={`flex flex-wrap gap-2 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, staggerChildren: 0.1 }}
    >
      <AnimatePresence mode="popLayout">
        {visibleActions.map((action, index) => (
          <motion.button
            key={action.id}
            onClick={() => onActionClick(action.id)}
            disabled={action.disabled}
            className={`
              ${getActionStyles(action.type)}
              px-4 py-2 rounded-full text-sm font-medium
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200 ease-out
              active:scale-95 hover:shadow-lg
              flex items-center space-x-2
            `}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              transition: { delay: index * 0.1 }
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.8, 
              y: -20,
              transition: { duration: 0.2 }
            }}
            whileHover={{ 
              scale: action.disabled ? 1 : 1.05,
              y: action.disabled ? 0 : -2
            }}
            whileTap={{ scale: action.disabled ? 1 : 0.95 }}
            layout
          >
            {action.icon && (
              <span className="text-base" role="img" aria-hidden="true">
                {action.icon}
              </span>
            )}
            <span>{action.label}</span>
            
            {/* Ripple effect for primary actions */}
            {action.type === 'primary' && (
              <motion.div
                className="absolute inset-0 rounded-full bg-white opacity-0"
                initial={false}
                whileTap={{
                  opacity: [0, 0.3, 0],
                  scale: [0.8, 1.2, 1.4]
                }}
                transition={{ duration: 0.3 }}
              />
            )}
          </motion.button>
        ))}
      </AnimatePresence>

      {/* Show more indicator if there are more actions */}
      {actions.length > maxVisible && (
        <motion.div
          className="flex items-center text-gray-500 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <span>+{actions.length - maxVisible} more</span>
        </motion.div>
      )}

      {/* Helpful hint for first-time users */}
      <motion.div
        className="w-full text-center text-xs text-gray-400 mt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        Tap any option to get started quickly
      </motion.div>
    </motion.div>
  );
};

export default QuickActions; 