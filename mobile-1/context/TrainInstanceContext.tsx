import React, { createContext, useContext, useState } from 'react';
import { ETAResponse } from '../types';
import { useTrainStream } from '../hooks/useTrainStream';

interface TrainInstanceContextType {
  trainNo: string;
  selectedStartDate: string | undefined;
  setSelectedStartDate: (date: string | undefined) => void;
  data: ETAResponse | null;
  isConnected: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const TrainInstanceContext = createContext<TrainInstanceContextType>({
  trainNo: '',
  selectedStartDate: undefined,
  setSelectedStartDate: () => {},
  data: null,
  isConnected: false,
  error: null,
  refresh: async () => {},
});

export function TrainInstanceProvider({
  trainNo,
  children,
}: {
  trainNo: string;
  children: React.ReactNode;
}) {
  const [selectedStartDate, setSelectedStartDate] = useState<string | undefined>(undefined);
  const { data, isConnected, error, refresh } = useTrainStream(trainNo, selectedStartDate);

  return (
    <TrainInstanceContext.Provider
      value={{
        trainNo,
        selectedStartDate,
        setSelectedStartDate,
        data,
        isConnected,
        error,
        refresh,
      }}
    >
      {children}
    </TrainInstanceContext.Provider>
  );
}

export function useTrainInstance() {
  return useContext(TrainInstanceContext);
}
