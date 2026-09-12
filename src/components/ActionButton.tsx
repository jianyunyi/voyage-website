import type { ButtonHTMLAttributes } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Clock3, FileUp, LogIn, MapPin, Route, Search, Send, ShieldCheck, ShieldX, Upload, type LucideIcon } from 'lucide-react';
import { getActionState, type ActionName, type ActionState } from '../lib/experience/actionState';
import { cn } from '../lib/utils';

const actionIcons: Record<ActionState['icon'], LucideIcon> = {
  'map-pin': MapPin,
  route: Route,
  'file-up': FileUp,
  'shield-check': ShieldCheck,
  'shield-x': ShieldX,
  send: Send,
  'clock-3': Clock3,
  search: Search,
  upload: Upload,
  'log-in': LogIn,
};

const actionLabelMinInlineSizes: Record<ActionName, string> = {
  'plan-route': '8ch',
  'publish-guide': '8ch',
  'publish-food': '8ch',
  'submit-review': '8ch',
  'approve-submission': '8ch',
  'reject-submission': '8ch',
  'search-price': '8ch',
  'upload-avatar': '8ch',
  'sign-in': '6ch',
};

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  action: ActionName;
  pending: boolean;
}

export function ActionButton({
  action,
  pending,
  className,
  disabled,
  type = 'button',
  ...props
}: ActionButtonProps) {
  const state = getActionState(action, pending);
  const Icon = actionIcons[state.icon];
  const shouldReduceMotion = useReducedMotion();
  const iconTransition = { duration: shouldReduceMotion ? 0 : 0.16 };

  return (
    <span>
      <button
        {...props}
        type={type}
        className={cn(className)}
        disabled={pending || disabled}
        aria-busy={pending}
      >
        <span
          aria-hidden="true"
          data-action-button-icon
          style={{
            alignItems: 'center',
            display: 'inline-flex',
            flex: '0 0 16px',
            height: 16,
            justifyContent: 'center',
            width: 16,
          }}
        >
          <AnimatePresence initial={false} mode="sync">
            <motion.span
              key={`${action}-${pending ? 'pending' : 'idle'}`}
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.8 }}
              transition={iconTransition}
              style={{ display: 'inline-flex' }}
            >
              <Icon size={16} focusable="false" />
            </motion.span>
          </AnimatePresence>
        </span>
        <span
          data-action-button-label
          style={{ display: 'inline-block', minInlineSize: actionLabelMinInlineSizes[action] }}
        >
          {state.label}
        </span>
      </button>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {state.liveMessage}
      </span>
    </span>
  );
}
