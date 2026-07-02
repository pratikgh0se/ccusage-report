class CcusageReport < Formula
  desc "Claude Code usage dashboard — generates HTML reports from ccusage data"
  homepage "https://github.com/pratikgh0se/ccusage-report"
  url "https://github.com/pratikgh0se/ccusage-report/archive/refs/tags/v1.0.0.tar.gz"
  sha256 "27bd1a819305a11d08792f4d331a6da12d9df9d7febca876053cfa5ec3e9de18"
  license "MIT"

  depends_on "node"

  def install
    libexec.install Dir["*.html", "generate.js"]
    (bin/"ccusage-report").write <<~EOS
      #!/bin/bash
      set -e
      # Install ccusage globally if missing
      if ! command -v ccusage &>/dev/null; then
        echo "Installing ccusage..."
        npm install -g ccusage
      fi
      node "#{libexec}/generate.js"
      open "#{libexec}/index.html"
    EOS
  end

  test do
    assert_predicate libexec/"generate.js", :exist?
    assert_predicate libexec/"index.html", :exist?
  end
end
