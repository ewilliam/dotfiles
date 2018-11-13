# frozen_string_literal: true

require 'rake'
require 'fileutils'

FILES = [
          '+Alfred 3',
          '.asdfrc',
          '+Code',
          '.bundle',
          '.ctags',
          'fish',
          '.gemrc',
          'git',
          '.hammerspoon',
          '.hushlogin',
          '.inputrc',
          'karabiner',
          '.pryrc',
          'neomutt',
          'newsboat',
          'nvim',
          '.offlineimaprc',
          'pianobar',
          '.pryrc',
          'ranger',
          '.tmux.conf',
          '.tool-versions'
        ]

task default: 'install'

desc "Write all configuration files to home folders."
task :install do
  check_envars

  FILES.each { |file| symlink_file(file) }
end

# rake link_file['.config_file .second_file']
desc "Symlink specific files."
task :link_file, [:file ] do |t, file|
  check_envars

  "#{file[:file]}".split.each do |single_file|
    symlink_file(single_file)
  end
end

private

def symlink_file(file)
  filename = file.split(/(?<=[+.])/) # [".", "example_file"] or ["example_file"]
  source = "#{ENV["PWD"]}/#{filename[1] || filename[0]}"
  envar = case filename[0]
          when "."
            "HOME"
          when "+"
            fake_filename = true
            "MACOS_CONFIG_HOME"
          else
            "XDG_CONFIG_HOME"
          end
  real_filename = fake_filename ? filename[1] : file
  target = "#{ENV[envar]}/#{real_filename}"

  puts "Linking #{source} to #{target}..."

  if File.exists?(target) || File.symlink?(target)
    puts "[Overwriting] #{target}..."
  end

  `ln -snFhv "#{source}" "#{target}"`
end

def check_envars
  error_msg = "Please set both $XDG_CONFIG_HOME and/or $MACOS_CONFIG_HOME"

  abort(error_msg) unless envars_set?
end

def envars_set?
  return false if ENV["XDG_CONFIG_HOME"].to_s.empty?

  if RbConfig::CONFIG['host_os'].include?("darwin")
    return false if ENV["MACOS_CONFIG_HOME"].to_s.empty?
  end

  true
end
