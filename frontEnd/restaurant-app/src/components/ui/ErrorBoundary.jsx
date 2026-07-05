import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[200px] flex items-center justify-center" role="alert">
          <div className="rounded-2xl bg-white ring-1 ring-[#EDE1CF] p-8 text-center max-w-md">
            <h2 className="font-serif text-xl text-[#3B2515] mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-[#9C8268] mb-4">
              An unexpected error occurred. Please try reloading the page.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="rounded-full bg-[#3B2515] text-[#F3E5D3] px-6 py-2.5 text-sm font-medium hover:bg-[#4A2E18] transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
