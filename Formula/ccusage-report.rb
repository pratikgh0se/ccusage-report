class CcusageReport < Formula
  desc "Claude Code usage dashboard — generates HTML reports from ccusage data"
  homepage "https://github.com/pratikgh0se/ccusage-report"
  url "https://github.com/pratikgh0se/ccusage-report/archive/refs/tags/v1.0.1.tar.gz"
  sha256 "ba64b7344027f393de69e8d2c0285e2a6dbdf1b5e4b88398e20b88e23d863621"
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
