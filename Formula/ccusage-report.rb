class CcusageReport < Formula
  desc "Claude Code usage dashboard — generates HTML reports from ccusage data"
  homepage "https://github.com/pratikgh0se/ccusage-report"
  url "https://github.com/pratikgh0se/ccusage-report/archive/refs/tags/v1.0.1.tar.gz"
  sha256 "07db9fbb6033e1a80b421c14d160a6e3106da1ee0ee4b9788b9f5fdfbece1f83"
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
