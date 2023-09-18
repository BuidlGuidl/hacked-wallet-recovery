import React, { useState } from "react";
import { createContext, useContext } from "react";

interface IErrorContext {
  error: string;
  setError: (arg: string) => void;
  setIsFinalProcessError: (arg: boolean) => void;
  isFinalProcessError: boolean;
}
const initalValue: IErrorContext = {
  error: "",
  setError: () => ({}),
  isFinalProcessError: false,
  setIsFinalProcessError: () => ({}),
};
export const ErrorContext = createContext<IErrorContext>(initalValue);

export const ErrorProvider = ({ children }: any) => {
  const [error, setError] = useState("");
  const [isFinalProcessError, setIsFinalProcessError] = useState(false);

  return (
    <ErrorContext.Provider
      value={{
        error: error,
        setError: (newErr: string) => setError(newErr),
        isFinalProcessError,
        setIsFinalProcessError,
      }}
    >
      {children}
    </ErrorContext.Provider>
  );
};

export const useShowError = () => {
  const { error, setError, setIsFinalProcessError, isFinalProcessError } = useContext(ErrorContext);
  const resetError = () => {
    setError("");
  };
  const showError = (newError: string, isFinal:boolean = false) => {
    setError(newError);
    setIsFinalProcessError(isFinal)
  };
  return {
    error,
    isFinalProcessError,
    resetError,
    showError,
  };
};
