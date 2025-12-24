/**
 * Dialog State Utility
 * 
 * A reactive utility for managing dialog open/close state with associated data.
 * Reduces boilerplate when working with multiple dialogs.
 */

export interface DialogState<T> {
    /** Whether the dialog is open */
    readonly open: boolean;
    /** The data associated with the dialog (available when open) */
    readonly data: T | null;
    /** Show the dialog with the given data */
    show: (payload: T) => void;
    /** Close the dialog and clear data */
    close: () => void;
    /** Toggle the dialog (for simple open/close without data) */
    toggle: () => void;
}

/**
 * Create a reactive dialog state manager.
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { createDialogState } from '$lib/utils/dialog.svelte';
 *   
 *   interface EditData {
 *     resource: NamedNode;
 *     value: string;
 *   }
 *   
 *   const editDialog = createDialogState<EditData>();
 *   
 *   // Open with data
 *   editDialog.show({ resource: someNode, value: 'Hello' });
 *   
 *   // In template
 *   // {#if editDialog.open}
 *   //   <Dialog data={editDialog.data} onclose={editDialog.close} />
 *   // {/if}
 * </script>
 * ```
 */
export function createDialogState<T = void>(): DialogState<T> {
    let isOpen = $state(false);
    let payload = $state<T | null>(null);

    return {
        get open() {
            return isOpen;
        },

        get data() {
            return payload;
        },

        show(data: T) {
            payload = data;
            isOpen = true;
        },

        close() {
            isOpen = false;
            // Delay clearing data slightly to allow exit animations
            setTimeout(() => {
                if (!isOpen) {
                    payload = null;
                }
            }, 200);
        },

        toggle() {
            if (isOpen) {
                this.close();
            } else {
                isOpen = true;
            }
        }
    };
}

/**
 * Create a confirmation dialog state with title, description, and action.
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { createConfirmDialog } from '$lib/utils/dialog.svelte';
 *   
 *   const confirm = createConfirmDialog();
 *   
 *   function handleDelete(resource: NamedNode) {
 *     confirm.show({
 *       title: 'Delete Resource?',
 *       description: 'This action cannot be undone.',
 *       onConfirm: () => deleteResource(resource)
 *     });
 *   }
 * </script>
 * 
 * <AlertDialog.Root bind:open={confirm.open}>
 *   <AlertDialog.Content>
 *     <AlertDialog.Title>{confirm.data?.title}</AlertDialog.Title>
 *     <AlertDialog.Description>{confirm.data?.description}</AlertDialog.Description>
 *     <AlertDialog.Footer>
 *       <AlertDialog.Cancel onclick={confirm.close}>Cancel</AlertDialog.Cancel>
 *       <AlertDialog.Action onclick={confirm.execute}>Continue</AlertDialog.Action>
 *     </AlertDialog.Footer>
 *   </AlertDialog.Content>
 * </AlertDialog.Root>
 * ```
 */
export interface ConfirmDialogData {
    title: string;
    description: string;
    onConfirm: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
}

export interface ConfirmDialogState extends DialogState<ConfirmDialogData> {
    /** Execute the confirmation action and close */
    execute: () => void;
}

export function createConfirmDialog(): ConfirmDialogState {
    const base = createDialogState<ConfirmDialogData>();

    return {
        // Explicitly forward getters to preserve reactivity
        get open() { return base.open; },
        get data() { return base.data; },
        show: base.show,
        close: base.close,
        toggle: base.toggle,

        execute() {
            base.data?.onConfirm();
            base.close();
        }
    };
}
