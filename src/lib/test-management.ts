import { supabase } from '@/integrations/supabase/client';

type DeleteTestResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
};

export const deleteTest = async (testId: string) => {
  const { data, error } = await supabase.functions.invoke('delete-test', {
    body: { testId },
  });

  if (error) {
    throw error;
  }

  const response = data as DeleteTestResponse | null;
  if (!response?.ok) {
    throw new Error(response?.error || 'Unable to delete this test right now.');
  }

  return response;
};
